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
  active: boolean;
  block_state: string;
};

const productHierarchyInclude = {
  group: {
    include: {
      subgroup: {
        include: { family: true },
      },
    },
  },
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Busca por similaridade pg_trgm (ITM-02). Filtra opcionalmente por item_kind. */
  async search(params: {
    q: string;
    hotelId?: string;
    itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
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
    const kindFilter = params.itemKind
      ? Prisma.sql`AND p.item_kind = ${params.itemKind}::"ItemKind"`
      : Prisma.empty;

    // Inclui inativos/bloqueados: trava de duplicidade CONSUMPTION não pode furar
    // quando BLOQUEIO_TOTAL deixa active=false.
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
        ) AS hotel_codes,
        p.active,
        p.block_state::text AS block_state
      FROM products p
      JOIN groups g ON g.id = p.group_id
      JOIN subgroups sg ON sg.id = g.subgroup_id
      JOIN families f ON f.id = sg.family_id
      LEFT JOIN product_hotels ph ON ph.product_id = p.id
      LEFT JOIN hotels h ON h.id = ph.hotel_id
      WHERE similarity(p.description_short, ${q}) > 0.08
        ${kindFilter}
      GROUP BY p.id, f.name, f.code
      ORDER BY similarity DESC, p.active DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      WHERE similarity(p.description_short, ${q}) > 0.08
        ${kindFilter}
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
      active: row.active,
      blockState: row.block_state,
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

  /**
   * Conta produtos com description_short exatamente igual a `q` (ativos e inativos).
   * Usado no fluxo de ativo fixo (não bloqueia inclusão — informa N unidades).
   */
  async exactCount(params: {
    q: string;
    itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
  }) {
    const q = params.q.trim().toUpperCase();
    if (!q) return { count: 0, sample: null };

    const where: Prisma.ProductWhereInput = {
      descriptionShort: q,
      ...(params.itemKind ? { itemKind: params.itemKind } : {}),
    };

    const [count, sample] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findFirst({
        where,
        select: {
          id: true,
          unifiedCode: true,
          descriptionShort: true,
          itemKind: true,
          active: true,
          blockState: true,
        },
        orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    return { count, sample };
  }

  /**
   * Contagem global barata: produtos CONSUMPTION ativos com descrição idêntica a outro.
   * FIXED_ASSET fica de fora — instâncias iguais são legítimas.
   */
  private async countExactDuplicateProducts(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      WHERE p.active = true
        AND p.item_kind = 'CONSUMPTION'::"ItemKind"
        AND EXISTS (
          SELECT 1
          FROM products o
          WHERE o.active = true
            AND o.item_kind = 'CONSUMPTION'::"ItemKind"
            AND o.id <> p.id
            AND o.description_short = p.description_short
        )
    `;
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * Para a página atual: marca duplicata exata ou próxima (pg_trgm via `%` + GIN).
   * Escopo = só os IDs da página (não o catálogo inteiro).
   */
  private async findDuplicatesForProductIds(productIds: string[]) {
    const byProduct = new Map<string, string>();
    if (!productIds.length) return byProduct;

    type DupRow = { id: string; similar_to: string | null };
    const idList = Prisma.join(productIds.map((id) => Prisma.sql`${id}::uuid`));

    const exact = await this.prisma.$queryRaw<DupRow[]>`
      SELECT
        p.id,
        (
          SELECT COALESCE(o.unified_code, o.sap_code, o.id::text)
          FROM products o
          WHERE o.item_kind = 'CONSUMPTION'::"ItemKind"
            AND o.id <> p.id
            AND (
              o.description_short = p.description_short
              OR (
                o.pdm_signature IS NOT NULL
                AND o.pdm_signature = p.pdm_signature
                AND o.pdm_family_id IS NOT DISTINCT FROM p.pdm_family_id
              )
            )
          ORDER BY o.active DESC, o.unified_code NULLS LAST
          LIMIT 1
        ) AS similar_to
      FROM products p
      WHERE p.id IN (${idList})
        AND p.item_kind = 'CONSUMPTION'::"ItemKind"
        AND EXISTS (
          SELECT 1
          FROM products o
          WHERE o.item_kind = 'CONSUMPTION'::"ItemKind"
            AND o.id <> p.id
            AND (
              o.description_short = p.description_short
              OR (
                o.pdm_signature IS NOT NULL
                AND o.pdm_signature = p.pdm_signature
                AND o.pdm_family_id IS NOT DISTINCT FROM p.pdm_family_id
              )
            )
        )
    `;
    for (const row of exact) {
      if (row.similar_to) byProduct.set(row.id, row.similar_to);
    }

    const pending = productIds.filter((id) => !byProduct.has(id));
    if (!pending.length) return byProduct;

    const pendingList = Prisma.join(pending.map((id) => Prisma.sql`${id}::uuid`));
    // `%` usa GIN trgm; limiar 0.5 alinhado ao indicador de duplicata.
    await this.prisma.$executeRaw`SELECT set_config('pg_trgm.similarity_threshold', '0.5', true)`;
    const near = await this.prisma.$queryRaw<DupRow[]>`
      SELECT p.id, d.similar_to
      FROM products p
      CROSS JOIN LATERAL (
        SELECT COALESCE(o.unified_code, o.sap_code, o.id::text) AS similar_to
        FROM products o
        WHERE o.item_kind = 'CONSUMPTION'::"ItemKind"
          AND o.id <> p.id
          AND o.description_short % p.description_short
          AND similarity(o.description_short, p.description_short) > 0.5
        ORDER BY similarity(o.description_short, p.description_short) DESC
        LIMIT 1
      ) d
      WHERE p.id IN (${pendingList})
        AND p.item_kind = 'CONSUMPTION'::"ItemKind"
    `;
    for (const row of near) {
      if (row.similar_to) byProduct.set(row.id, row.similar_to);
    }

    return byProduct;
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
    if (params.familyId) {
      where.group = { subgroup: { familyId: params.familyId } };
    }
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

    const [total, data, exactDupCount] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          ...productHierarchyInclude,
          measureUnit: true,
          hotels: { include: { hotel: true } },
        },
        orderBy: { descriptionShort: 'asc' },
        skip,
        take,
      }),
      params.active === 'false' ? Promise.resolve(0) : this.countExactDuplicateProducts(),
    ]);

    const byProduct = await this.findDuplicatesForProductIds(data.map((p) => p.id));

    return {
      ...pageResult(
        data.map((p) => ({
          ...p,
          family: p.group.subgroup.family,
          hotelCodes: p.hotels.map((ph) => ph.hotel.code),
          possibleDuplicate: byProduct.has(p.id),
          similarTo: byProduct.get(p.id) ?? null,
        })),
        total,
        params,
      ),
      duplicateSummary: { pairCount: exactDupCount },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        ...productHierarchyInclude,
        measureUnit: true,
        hotels: { include: { hotel: true, costCenter: true } },
        attributeValues: { include: { attribute: true } },
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return {
      ...product,
      family: product.group.subgroup.family,
    };
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
        include: {
          ...productHierarchyInclude,
          hotels: { include: { hotel: true } },
        },
        orderBy: { descriptionShort: 'asc' },
        skip,
        take,
      }),
    ]);
    return pageResult(
      data.map((p) => ({
        ...p,
        family: p.group.subgroup.family,
      })),
      total,
      params,
    );
  }
}
