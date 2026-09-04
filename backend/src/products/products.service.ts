import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { pageResult, skipTake, type PageParams } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

export type ProductSearchRow = {
  id: string;
  unified_code: string | null;
  legacy_code: string | null;
  sap_code: string | null;
  description_short: string;
  family_name: string;
  family_code: string;
  subgroup_name: string;
  group_name: string;
  ncm_code: string | null;
  measure_unit_code: string | null;
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

/** Colunas ordenáveis da base de produtos (query `sort`). */
export const PRODUCT_BASE_SORTS = [
  'status',
  'code',
  'sap',
  'desc',
  'family',
  'ncm',
  'unit',
  'createdAt',
] as const;

export type ProductBaseSort = (typeof PRODUCT_BASE_SORTS)[number];

function isProductBaseSort(value?: string): value is ProductBaseSort {
  return !!value && (PRODUCT_BASE_SORTS as readonly string[]).includes(value);
}

/**
 * Monta `orderBy` da listagem da base. Default: descrição A–Z.
 */
export function resolveProductBaseOrder(
  sort?: string,
  dir?: string,
): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = dir === 'desc' ? 'desc' : 'asc';
  if (!isProductBaseSort(sort)) {
    return { descriptionShort: 'asc' };
  }
  switch (sort) {
    case 'status':
      return [{ active: direction }, { descriptionShort: 'asc' }];
    case 'code':
      return [{ legacyCode: direction }, { unifiedCode: direction }];
    case 'sap':
      return [{ sapCode: direction }, { descriptionShort: 'asc' }];
    case 'desc':
      return { descriptionShort: direction };
    case 'family':
      return {
        group: { subgroup: { family: { name: direction } } },
      };
    case 'ncm':
      return [{ ncmCode: direction }, { descriptionShort: 'asc' }];
    case 'unit':
      return [{ measureUnit: { code: direction } }, { descriptionShort: 'asc' }];
    case 'createdAt':
      return [{ createdAt: direction }, { id: 'asc' }];
    default:
      return { descriptionShort: 'asc' };
  }
}

/** Item da base original (importação SAP) — nunca pode ser apagado. */
export function isProtectedBaseProduct(product: { sapCode: string | null }) {
  return Boolean(product.sapCode?.trim());
}

/**
 * Sentinela que nunca casa — evita `LIKE ''` capturar a base inteira.
 * NCM é sempre numérico, então texto puro é seguro (e sem byte NUL, que o
 * Postgres rejeita em parâmetros de texto).
 */
const NO_MATCH = '__sem_correspondencia__';

/** Escapa curingas de `LIKE` para tratar a busca como texto literal. */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca por similaridade pg_trgm na descrição (ITM-02) **ou** por qualquer
   * código do produto (unificado, legado, SAP, NCM).
   * Código exato pontua 1.0 e prefixo 0.95 — sempre à frente dos similares.
   */
  async search(params: {
    q: string;
    hotelId?: string;
    itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
    /** Bloqueio só pode incidir sobre item ativo. */
    activeOnly?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const q = params.q.trim().toUpperCase();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    // Descrição precisa de 3 caracteres; código pode ter 2 (ex.: centro "11").
    if (q.length < 2) {
      return pageResult([], 0, { page, pageSize });
    }

    const offset = (page - 1) * pageSize;
    const kindFilter = params.itemKind
      ? Prisma.sql`AND p.item_kind = ${params.itemKind}::"ItemKind"`
      : Prisma.empty;
    const activeFilter = params.activeOnly
      ? Prisma.sql`AND p.active = true`
      : Prisma.empty;

    const likePrefix = `${escapeLike(q)}%`;
    const ncmDigits = q.replace(/\D/g, '');
    const ncmExact = ncmDigits.length >= 4 ? ncmDigits : NO_MATCH;
    const ncmPrefix = ncmDigits.length >= 4 ? `${ncmDigits}%` : NO_MATCH;

    const codeExact = Prisma.sql`(
      upper(coalesce(p.unified_code, '')) = ${q}
      OR upper(coalesce(p.legacy_code, '')) = ${q}
      OR upper(coalesce(p.sap_code, '')) = ${q}
      OR trim(coalesce(p.ncm_code, '')) = ${ncmExact}
    )`;
    const codePrefix = Prisma.sql`(
      upper(coalesce(p.unified_code, '')) LIKE ${likePrefix}
      OR upper(coalesce(p.legacy_code, '')) LIKE ${likePrefix}
      OR upper(coalesce(p.sap_code, '')) LIKE ${likePrefix}
      OR trim(coalesce(p.ncm_code, '')) LIKE ${ncmPrefix}
    )`;
    const descMatch =
      q.length >= 3
        ? Prisma.sql`similarity(p.description_short, ${q}) > 0.08`
        : Prisma.sql`false`;
    const score = Prisma.sql`
      CASE
        WHEN ${codeExact} THEN 1.0
        WHEN ${codePrefix} THEN 0.95
        ELSE similarity(p.description_short, ${q})
      END
    `;
    const matchFilter = Prisma.sql`(${descMatch} OR ${codePrefix})`;

    // Inclui inativos/bloqueados por padrão: trava de duplicidade CONSUMPTION não
    // pode furar quando bloqueio total deixa active=false.
    const rows = await this.prisma.$queryRaw<ProductSearchRow[]>`
      SELECT
        p.id,
        p.unified_code,
        p.legacy_code,
        p.sap_code,
        p.description_short,
        f.name AS family_name,
        f.code AS family_code,
        sg.name AS subgroup_name,
        g.name AS group_name,
        p.ncm_code,
        mu.code AS measure_unit_code,
        ${score} AS similarity,
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
      LEFT JOIN measure_units mu ON mu.id = p.measure_unit_id
      LEFT JOIN product_hotels ph ON ph.product_id = p.id
      LEFT JOIN hotels h ON h.id = ph.hotel_id
      WHERE ${matchFilter}
        ${kindFilter}
        ${activeFilter}
      GROUP BY
        p.id, f.name, f.code, sg.name, g.name, mu.code
      ORDER BY similarity DESC, p.active DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      WHERE ${matchFilter}
        ${kindFilter}
        ${activeFilter}
    `;

    const total = Number(countResult[0]?.count ?? 0);

    const data = rows.map((row) => ({
      id: row.id,
      unifiedCode: row.unified_code,
      legacyCode: row.legacy_code,
      sapCode: row.sap_code,
      descriptionShort: row.description_short,
      familyName: row.family_name,
      familyCode: row.family_code,
      subgroupName: row.subgroup_name,
      groupName: row.group_name,
      ncmCode: row.ncm_code,
      measureUnitCode: row.measure_unit_code,
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
        .map((o) => o.legacy_code ?? o.unified_code)
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

    const pendingList = Prisma.join(
      pending.map((id) => Prisma.sql`${id}::uuid`),
    );
    // `%` usa GIN trgm; limiar 0.5 alinhado ao indicador de duplicata.
    await this.prisma
      .$executeRaw`SELECT set_config('pg_trgm.similarity_threshold', '0.5', true)`;
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

  /** Base de produtos — 1 produto, N hotéis; status, família, tipo (UC / AF) e ordenação. */
  async findBase(
    params: {
      search?: string;
      hotelCode?: string;
      active?: string;
      familyId?: string;
      itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
      sort?: string;
      dir?: string;
    } & PageParams,
  ) {
    const where: Prisma.ProductWhereInput = {};
    if (params.active === 'false') where.active = false;
    else if (params.active === 'all') {
      /* sem filtro de status */
    } else {
      where.active = true;
    }
    if (params.itemKind) {
      where.itemKind = params.itemKind;
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
        orderBy: resolveProductBaseOrder(params.sort, params.dir),
        skip,
        take,
      }),
      params.active === 'false'
        ? Promise.resolve(0)
        : this.countExactDuplicateProducts(),
    ]);

    const byProduct = await this.findDuplicatesForProductIds(
      data.map((p) => p.id),
    );

    return {
      ...pageResult(
        data.map((p) => ({
          ...p,
          family: p.group.subgroup.family,
          hotelCodes: p.hotels.map((ph) => ph.hotel.code),
          possibleDuplicate: byProduct.has(p.id),
          similarTo: byProduct.get(p.id) ?? null,
          fromOriginalBase: isProtectedBaseProduct(p),
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
        costCenter: true,
        hotels: { include: { hotel: true, costCenter: true } },
        attributeValues: { include: { attribute: true } },
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return {
      ...product,
      family: product.group.subgroup.family,
      fromOriginalBase: isProtectedBaseProduct(product),
    };
  }

  /**
   * Exclui item cadastrado pelo portal (sem `sap_code`).
   * Itens da base original SAP não podem ser apagados.
   */
  async removePortalProduct(id: string, role?: UserRole) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Apenas o administrador pode excluir itens da base.',
      );
    }
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, sapCode: true, descriptionShort: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    if (isProtectedBaseProduct(product)) {
      throw new ForbiddenException(
        'Itens da base original (SAP) não podem ser excluídos.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.requestItem.updateMany({
        where: { productId: id },
        data: { productId: null },
      }),
      this.prisma.product.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  async findInactive(params: { search?: string } & PageParams) {
    const where: Prisma.ProductWhereInput = { active: false };
    if (params.search) {
      const q = params.search.toUpperCase();
      where.OR = [
        { descriptionShort: { contains: q, mode: 'insensitive' } },
        { unifiedCode: { contains: q, mode: 'insensitive' } },
        { sapCode: { contains: q, mode: 'insensitive' } },
        { legacyCode: { contains: q, mode: 'insensitive' } },
        { ncmCode: { contains: q, mode: 'insensitive' } },
      ];
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
