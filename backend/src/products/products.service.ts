import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  pageResult,
  skipTake,
  type PageParams,
} from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

export type ProductSearchRow = {
  id: string;
  unified_code: string | null;
  description_short: string;
  family_name: string;
  family_code: string;
  similarity: number;
  hotel_codes: string[];
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Busca por similaridade pg_trgm (ITM-02). */
  async search(params: {
    q: string;
    hotelId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const q = params.q.trim().toUpperCase();
    if (q.length < 3) {
      return pageResult([], 0, { page: params.page ?? 1, pageSize: params.pageSize ?? 20 });
    }

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const rows = await this.prisma.$queryRaw<ProductSearchRow[]>`
      SELECT
        p.id,
        p.unified_code,
        p.description_short,
        f.name AS family_name,
        f.code AS family_code,
        similarity(p.description_short, ${q}) AS similarity,
        COALESCE(
          array_agg(DISTINCT h.code) FILTER (WHERE h.code IS NOT NULL),
          ARRAY[]::text[]
        ) AS hotel_codes
      FROM products p
      JOIN families f ON f.id = p.family_id
      LEFT JOIN product_hotels ph ON ph.product_id = p.id
      LEFT JOIN hotels h ON h.id = ph.hotel_id
      WHERE p.active = true
        AND similarity(p.description_short, ${q}) > 0.08
      GROUP BY p.id, f.name, f.code
      ORDER BY similarity DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      WHERE p.active = true
        AND similarity(p.description_short, ${q}) > 0.08
    `;

    const total = Number(countResult[0]?.count ?? 0);

    const data = rows.map((row) => ({
      id: row.id,
      unifiedCode: row.unified_code,
      descriptionShort: row.description_short,
      familyName: row.family_name,
      familyCode: row.family_code,
      similarity: Number(row.similarity),
      hotelCodes: row.hotel_codes ?? [],
      similarTo: rows
        .filter(
          (other) =>
            other.id !== row.id &&
            Number(other.similarity) > 0.5 &&
            Math.abs(Number(other.similarity) - Number(row.similarity)) < 0.15,
        )
        .map((o) => o.unified_code)
        .filter(Boolean)
        .slice(0, 1),
    }));

    return pageResult(data, total, { page, pageSize });
  }

  /** Pares de produtos com alta similaridade (P9 — indicador de duplicata). */
  private async findDuplicatePairs() {
    type DupRow = { id1: string; id2: string; code1: string | null; code2: string | null };
    const pairs = await this.prisma.$queryRaw<DupRow[]>`
      SELECT p1.id AS id1, p2.id AS id2, p1.unified_code AS code1, p2.unified_code AS code2
      FROM products p1
      JOIN products p2 ON p1.id < p2.id
      WHERE p1.active = true
        AND p2.active = true
        AND similarity(p1.description_short, p2.description_short) > 0.5
    `;

    const byProduct = new Map<string, string>();
    for (const pair of pairs) {
      byProduct.set(pair.id1, pair.code2 ?? pair.id2);
      byProduct.set(pair.id2, pair.code1 ?? pair.id1);
    }
    return { byProduct, count: pairs.length };
  }

  /** Base de produtos — 1 produto, N hotéis; status e família como filtros. */
  async findBase(params: {
    search?: string;
    hotelCode?: string;
    active?: string;
    familyId?: string;
  } & PageParams) {
    const where: Prisma.ProductWhereInput = {};
    if (params.active === 'false') where.active = false;
    else if (params.active === 'all') {
      /* sem filtro de status */
    } else {
      where.active = true;
    }
    if (params.familyId) where.familyId = params.familyId;
    if (params.search) {
      const q = params.search.toUpperCase();
      where.OR = [
        { descriptionShort: { contains: q, mode: 'insensitive' } },
        { descriptionLong: { contains: q, mode: 'insensitive' } },
        { unifiedCode: { contains: q, mode: 'insensitive' } },
        { sapCode: { contains: q, mode: 'insensitive' } },
        { legacyCode: { contains: q, mode: 'insensitive' } },
        { ncmCode: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (params.hotelCode) {
      where.hotels = { some: { hotel: { code: params.hotelCode } } };
    }

    const { skip, take } = skipTake(params);
    const { byProduct, count: duplicatePairCount } = await this.findDuplicatePairs();

    const [total, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          family: { include: { subgroup: { include: { group: true } } } },
          measureUnit: true,
          hotels: { include: { hotel: true } },
        },
        orderBy: { descriptionShort: 'asc' },
        skip,
        take,
      }),
    ]);

    return {
      ...pageResult(
        data.map((p) => ({
          ...p,
          hotelCodes: p.hotels.map((ph) => ph.hotel.code),
          possibleDuplicate: byProduct.has(p.id),
          similarTo: byProduct.get(p.id) ?? null,
        })),
        total,
        params,
      ),
      duplicateSummary: { pairCount: duplicatePairCount },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        family: { include: { subgroup: { include: { group: true } } } },
        measureUnit: true,
        hotels: { include: { hotel: true, costCenter: true } },
        attributeValues: { include: { attribute: true } },
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async findInactive(params: { search?: string } & PageParams) {
    const where: Prisma.ProductWhereInput = { active: false };
    if (params.search) {
      where.descriptionShort = {
        contains: params.search.toUpperCase(),
        mode: 'insensitive',
      };
    }
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { family: true, hotels: { include: { hotel: true } } },
        orderBy: { descriptionShort: 'asc' },
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }
}
