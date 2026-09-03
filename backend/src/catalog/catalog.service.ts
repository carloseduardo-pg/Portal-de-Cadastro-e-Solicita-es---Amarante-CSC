import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemKind, Prisma } from '@prisma/client';
import { pageResult, skipTake, type PageParams } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

const QUARANTINE_NAME = 'NAO CLASSIFICADO';
const ITENS_GROUP_NAME = 'ITENS';

export type HierarchyAnomaly = 'quarantine' | 'ambiguous' | 'itens_placeholder';

function familyAnomalies(code: string, name: string): HierarchyAnomaly[] {
  const flags: HierarchyAnomaly[] = [];
  if (name === QUARANTINE_NAME) flags.push('quarantine');
  // Famílias TMP_* residuais da resolução de ambiguidade na importação SAP
  if (code.startsWith('TMP_')) flags.push('ambiguous');
  return flags;
}

function subgroupAnomalies(name: string): HierarchyAnomaly[] {
  return name === QUARANTINE_NAME ? ['quarantine'] : [];
}

function groupAnomalies(name: string): HierarchyAnomaly[] {
  const flags: HierarchyAnomaly[] = [];
  if (name === QUARANTINE_NAME) flags.push('quarantine');
  if (name === ITENS_GROUP_NAME) flags.push('itens_placeholder');
  return flags;
}

function uuidList(ids: string[]) {
  return Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`));
}

function normalizeUpper(value: string) {
  return value.trim().toUpperCase();
}

function resolveActiveFilter(status?: string) {
  if (!status || status === 'active') return true;
  if (status === 'inactive') return false;
  if (status === 'all') return undefined;
  return true;
}

async function generateManualCode<T extends { code: string }>(
  pickExistingCodes: () => Promise<T[]>,
  prefix: string,
) {
  const rows = await pickExistingCodes();
  const used = new Set(
    rows
      .map((r) => {
        const m = r.code.match(new RegExp(`^${prefix}(\\d+)$`));
        return m ? Number(m[1]) : 0;
      })
      .filter((n) => Number.isFinite(n) && n > 0),
  );
  let next = 1;
  while (used.has(next)) next += 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Hotéis / unidades operacionais, com filtro de status. */
  hotels(status?: string) {
    const active = resolveActiveFilter(status);
    return this.prisma.hotel.findMany({
      where: active === undefined ? {} : { active },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Famílias SAP (nível mais amplo). Contagem de itens + flags de anomalia de importação.
   */
  async families(
    params: {
      search?: string;
      itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
      status?: string;
    } & PageParams,
  ) {
    const search = params.search?.trim();
    const active = resolveActiveFilter(params.status);
    const where: Prisma.FamilyWhereInput = {
      ...(active === undefined ? {} : { active }),
      ...(params.itemKind ? { itemKind: params.itemKind } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.family.count({ where }),
      this.prisma.family.findMany({
        where,
        include: {
          _count: { select: { productAttributes: true, subgroups: true } },
        },
        orderBy: [{ itemKind: 'asc' }, { name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);

    const countMap = new Map<string, number>();
    if (data.length) {
      const rows = await this.prisma.$queryRaw<
        { family_id: string; n: bigint }[]
      >`
        SELECT sg.family_id, COUNT(p.id)::bigint AS n
        FROM products p
        JOIN groups g ON g.id = p.group_id
        JOIN subgroups sg ON sg.id = g.subgroup_id
        WHERE p.active = true
          AND sg.family_id IN (${uuidList(data.map((f) => f.id))})
        GROUP BY sg.family_id
      `;
      for (const row of rows) countMap.set(row.family_id, Number(row.n));
    }

    return pageResult(
      data.map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
        active: f.active,
        itemKind: f.itemKind,
        attributesCount: f._count.productAttributes,
        subgroupsCount: f._count.subgroups,
        productsCount: countMap.get(f.id) ?? 0,
        anomalies: familyAnomalies(f.code, f.name),
      })),
      total,
      params,
    );
  }

  familyAttributes(familyId: string) {
    return this.prisma.productAttribute.findMany({
      where: { familyId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  /** Grupos de itens (folha). Pai = subgrupo + família. */
  async groups(
    params: {
      search?: string;
      subgroupId?: string;
      itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
      status?: string;
    } & PageParams,
  ) {
    const search = params.search?.trim();
    const active = resolveActiveFilter(params.status);
    const where: Prisma.GroupWhereInput = {
      ...(active === undefined ? {} : { active }),
      ...(params.subgroupId ? { subgroupId: params.subgroupId } : {}),
      ...(params.itemKind
        ? { subgroup: { family: { itemKind: params.itemKind } } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { catalogCode: { contains: search, mode: 'insensitive' } },
              {
                subgroup: {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    {
                      family: {
                        name: { contains: search, mode: 'insensitive' },
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
    };
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.group.count({ where }),
      this.prisma.group.findMany({
        where,
        include: {
          subgroup: {
            select: {
              id: true,
              code: true,
              name: true,
              familyId: true,
              family: {
                select: { id: true, code: true, name: true, itemKind: true },
              },
            },
          },
        },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);

    const activeCounts = new Map<string, number>();
    if (data.length) {
      const rows = await this.prisma.$queryRaw<
        { group_id: string; n: bigint }[]
      >`
        SELECT p.group_id, COUNT(*)::bigint AS n
        FROM products p
        WHERE p.active = true
          AND p.group_id IN (${uuidList(data.map((g) => g.id))})
        GROUP BY p.group_id
      `;
      for (const row of rows) activeCounts.set(row.group_id, Number(row.n));
    }

    return pageResult(
      data.map((g) => ({
        id: g.id,
        code: g.code,
        catalogCode: g.catalogCode,
        name: g.name,
        active: g.active,
        subgroupId: g.subgroupId,
        familyId: g.subgroup.familyId,
        itemKind: g.subgroup.family.itemKind,
        subgroup: {
          id: g.subgroup.id,
          code: g.subgroup.code,
          name: g.subgroup.name,
        },
        family: {
          id: g.subgroup.family.id,
          code: g.subgroup.family.code,
          name: g.subgroup.family.name,
        },
        productsCount: activeCounts.get(g.id) ?? 0,
        anomalies: groupAnomalies(g.name),
      })),
      total,
      params,
    );
  }

  /** Subgrupos. Pai = família. */
  async subgroups(
    params: {
      search?: string;
      familyId?: string;
      itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
      status?: string;
    } & PageParams,
  ) {
    const search = params.search?.trim();
    const active = resolveActiveFilter(params.status);
    const where: Prisma.SubgroupWhereInput = {
      ...(active === undefined ? {} : { active }),
      ...(params.familyId ? { familyId: params.familyId } : {}),
      ...(params.itemKind ? { family: { itemKind: params.itemKind } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { family: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.subgroup.count({ where }),
      this.prisma.subgroup.findMany({
        where,
        include: {
          family: {
            select: { id: true, code: true, name: true, itemKind: true },
          },
          _count: { select: { groups: true } },
        },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);

    const countMap = new Map<string, number>();
    if (data.length) {
      const rows = await this.prisma.$queryRaw<
        { subgroup_id: string; n: bigint }[]
      >`
        SELECT g.subgroup_id, COUNT(p.id)::bigint AS n
        FROM products p
        JOIN groups g ON g.id = p.group_id
        WHERE p.active = true
          AND g.subgroup_id IN (${uuidList(data.map((s) => s.id))})
        GROUP BY g.subgroup_id
      `;
      for (const row of rows) countMap.set(row.subgroup_id, Number(row.n));
    }

    return pageResult(
      data.map((sg) => ({
        id: sg.id,
        code: sg.code,
        name: sg.name,
        active: sg.active,
        familyId: sg.familyId,
        itemKind: sg.family.itemKind,
        family: sg.family,
        groupsCount: sg._count.groups,
        productsCount: countMap.get(sg.id) ?? 0,
        anomalies: subgroupAnomalies(sg.name),
      })),
      total,
      params,
    );
  }

  async measureUnits(params: PageParams & { status?: string }) {
    const { skip, take } = skipTake(params);
    const active = resolveActiveFilter(params.status);
    const where = active === undefined ? {} : { active };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.measureUnit.count({ where }),
      this.prisma.measureUnit.findMany({
        where,
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }

  costCenters(hotelId?: string, hotelIds?: string, status?: string) {
    const ids =
      hotelIds
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    const active = resolveActiveFilter(status);
    const activeClause = active === undefined ? {} : { active };
    const where =
      ids.length > 0
        ? { hotelId: { in: ids }, ...activeClause }
        : { ...(hotelId ? { hotelId } : {}), ...activeClause };
    return this.prisma.costCenter.findMany({
      where,
      orderBy: [{ hotel: { name: 'asc' } }, { name: 'asc' }, { code: 'asc' }],
      include: { hotel: { select: { id: true, code: true, name: true } } },
    });
  }

  async warehouses(params: PageParams & { status?: string }) {
    const { skip, take } = skipTake(params);
    const active = resolveActiveFilter(params.status);
    const where = active === undefined ? {} : { active };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.warehouse.count({ where }),
      this.prisma.warehouse.findMany({
        where,
        include: { hotel: true },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }

  /** Cria família manual para uso no catálogo de parametrizações. */
  async createFamily(input: {
    name: string;
    itemKind: ItemKind;
    code?: string;
  }) {
    const name = normalizeUpper(input.name);
    if (!name) throw new BadRequestException('Nome da família é obrigatório.');
    const code =
      normalizeUpper(input.code ?? '') ||
      (await generateManualCode(
        () =>
          this.prisma.family.findMany({
            where: { itemKind: input.itemKind, code: { startsWith: 'MANF' } },
            select: { code: true },
          }),
        'MANF',
      ));

    const existsCode = await this.prisma.family.findUnique({ where: { code } });
    if (existsCode && existsCode.name !== name) {
      throw new BadRequestException(`Código de família já existe: ${code}`);
    }

    const row = await this.prisma.family.upsert({
      where: { name_itemKind: { name, itemKind: input.itemKind } },
      update: { active: true, code },
      create: { name, itemKind: input.itemKind, code, active: true },
    });
    return row;
  }

  /** Cria subgrupo manual vinculado à família. */
  async createSubgroup(input: {
    familyId: string;
    name: string;
    code?: string;
  }) {
    const family = await this.prisma.family.findUnique({
      where: { id: input.familyId },
    });
    if (!family) throw new NotFoundException('Família não encontrada.');
    const name = normalizeUpper(input.name);
    if (!name) throw new BadRequestException('Nome do subgrupo é obrigatório.');
    const code =
      normalizeUpper(input.code ?? '') ||
      (await generateManualCode(
        () =>
          this.prisma.subgroup.findMany({
            where: { code: { startsWith: 'MANS' } },
            select: { code: true },
          }),
        'MANS',
      ));

    const existsCode = await this.prisma.subgroup.findUnique({
      where: { code },
    });
    if (existsCode && existsCode.name !== name) {
      throw new BadRequestException(`Código de subgrupo já existe: ${code}`);
    }

    const row = await this.prisma.subgroup.upsert({
      where: { familyId_name: { familyId: family.id, name } },
      update: { active: true, code },
      create: { familyId: family.id, name, code, active: true },
    });
    return row;
  }

  /** Cria grupo manual vinculado ao subgrupo, guardando código real da classificação. */
  async createGroup(input: {
    subgroupId: string;
    name: string;
    catalogCode: string;
    code?: string;
  }) {
    const subgroup = await this.prisma.subgroup.findUnique({
      where: { id: input.subgroupId },
    });
    if (!subgroup) throw new NotFoundException('Subgrupo não encontrado.');
    const name = normalizeUpper(input.name);
    const catalogCode = normalizeUpper(input.catalogCode);
    if (!name) throw new BadRequestException('Nome do grupo é obrigatório.');
    if (!catalogCode)
      throw new BadRequestException('Código do grupo é obrigatório.');

    const code =
      normalizeUpper(input.code ?? '') ||
      (await generateManualCode(
        () =>
          this.prisma.group.findMany({
            where: { code: { startsWith: 'MANG' } },
            select: { code: true },
          }),
        'MANG',
      ));
    const row = await this.prisma.group.upsert({
      where: { subgroupId_name: { subgroupId: subgroup.id, name } },
      update: { active: true, code, catalogCode },
      create: {
        subgroupId: subgroup.id,
        name,
        code,
        catalogCode,
        active: true,
      },
    });
    return row;
  }

  /**
   * Cria centro de custo global: replica para todos os hotéis ativos.
   * Mantém o modelo atual (cost_center por hotel) sem exigir vínculo no formulário.
   */
  async createCostCenter(input: { code: string; name: string }) {
    const code = normalizeUpper(input.code);
    const name = normalizeUpper(input.name);
    if (!code)
      throw new BadRequestException('Código do centro de custo é obrigatório.');
    if (!name)
      throw new BadRequestException('Nome do centro de custo é obrigatório.');

    const hotels = await this.prisma.hotel.findMany({
      where: { active: true },
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
    });
    if (!hotels.length)
      throw new BadRequestException(
        'Nenhum hotel ativo para vincular o centro.',
      );

    let upserts = 0;
    for (const h of hotels) {
      await this.prisma.costCenter.upsert({
        where: { hotelId_code: { hotelId: h.id, code } },
        update: { name, active: true },
        create: { hotelId: h.id, code, name, active: true },
      });
      upserts += 1;
    }
    return { code, name, hotelsLinked: upserts };
  }

  /** Atualiza família (nome, tipo e código). */
  async updateFamily(
    id: string,
    input: { name?: string; itemKind?: ItemKind; code?: string },
  ) {
    const current = await this.prisma.family.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Família não encontrada.');

    const name = input.name ? normalizeUpper(input.name) : current.name;
    const itemKind = input.itemKind ?? current.itemKind;
    const code = input.code ? normalizeUpper(input.code) : current.code;

    if (itemKind !== current.itemKind) {
      const [subgroupsCount, productsCount, openRequestsCount] = await Promise.all([
        this.prisma.subgroup.count({ where: { familyId: id, active: true } }),
        this.prisma.product.count({
          where: { active: true, group: { subgroup: { familyId: id } } },
        }),
        this.prisma.request.count({ where: { familyId: id, closedAt: null } }),
      ]);
      if (subgroupsCount || productsCount || openRequestsCount) {
        throw new BadRequestException(
          'Não é possível trocar o tipo da família com subgrupos/produtos/solicitações ativas vinculadas.',
        );
      }
    }

    const byCode = await this.prisma.family.findUnique({ where: { code } });
    if (byCode && byCode.id !== id) {
      throw new BadRequestException(`Código de família já existe: ${code}`);
    }

    return this.prisma.family.update({
      where: { id },
      data: { name, itemKind, code, active: true },
    });
  }

  /** Inativa família com validação de dependências ativas. */
  async deactivateFamily(id: string) {
    const current = await this.prisma.family.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Família não encontrada.');
    const [subgroupsCount, productsCount, openRequestsCount] = await Promise.all([
      this.prisma.subgroup.count({ where: { familyId: id, active: true } }),
      this.prisma.product.count({
        where: { active: true, group: { subgroup: { familyId: id } } },
      }),
      this.prisma.request.count({ where: { familyId: id, closedAt: null } }),
    ]);
    if (subgroupsCount || productsCount || openRequestsCount) {
      throw new BadRequestException(
        'Não é possível inativar família com subgrupos/produtos/solicitações ativas vinculadas.',
      );
    }
    await this.prisma.family.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }

  /** Atualiza subgrupo (família, nome e código). */
  async updateSubgroup(
    id: string,
    input: { familyId?: string; name?: string; code?: string },
  ) {
    const current = await this.prisma.subgroup.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Subgrupo não encontrado.');

    const familyId = input.familyId ?? current.familyId;
    const name = input.name ? normalizeUpper(input.name) : current.name;
    const code = input.code ? normalizeUpper(input.code) : current.code;

    if (familyId !== current.familyId) {
      const [targetFamily, activeGroups, activeProducts] = await Promise.all([
        this.prisma.family.findUnique({ where: { id: familyId } }),
        this.prisma.group.count({ where: { subgroupId: id, active: true } }),
        this.prisma.product.count({ where: { group: { subgroupId: id }, active: true } }),
      ]);
      if (!targetFamily) throw new NotFoundException('Família de destino não encontrada.');
      if (activeGroups || activeProducts) {
        throw new BadRequestException(
          'Não é possível mover subgrupo com grupos/produtos ativos vinculados.',
        );
      }
    }

    const byCode = await this.prisma.subgroup.findUnique({ where: { code } });
    if (byCode && byCode.id !== id) {
      throw new BadRequestException(`Código de subgrupo já existe: ${code}`);
    }

    return this.prisma.subgroup.update({
      where: { id },
      data: { familyId, name, code, active: true },
    });
  }

  /** Inativa subgrupo com validação de dependências ativas. */
  async deactivateSubgroup(id: string) {
    const current = await this.prisma.subgroup.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Subgrupo não encontrado.');
    const [groupsCount, productsCount] = await Promise.all([
      this.prisma.group.count({ where: { subgroupId: id, active: true } }),
      this.prisma.product.count({ where: { group: { subgroupId: id }, active: true } }),
    ]);
    if (groupsCount || productsCount) {
      throw new BadRequestException(
        'Não é possível inativar subgrupo com grupos/produtos ativos vinculados.',
      );
    }
    await this.prisma.subgroup.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }

  /** Atualiza grupo (subgrupo, nome, código interno e código real). */
  async updateGroup(
    id: string,
    input: {
      subgroupId?: string;
      name?: string;
      catalogCode?: string;
      code?: string;
    },
  ) {
    const current = await this.prisma.group.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Grupo não encontrado.');

    const subgroupId = input.subgroupId ?? current.subgroupId;
    const name = input.name ? normalizeUpper(input.name) : current.name;
    const code = input.code ? normalizeUpper(input.code) : current.code;
    const catalogCode = input.catalogCode
      ? normalizeUpper(input.catalogCode)
      : current.catalogCode;

    if (subgroupId !== current.subgroupId) {
      const [targetSubgroup, activeProducts] = await Promise.all([
        this.prisma.subgroup.findUnique({ where: { id: subgroupId } }),
        this.prisma.product.count({ where: { groupId: id, active: true } }),
      ]);
      if (!targetSubgroup) throw new NotFoundException('Subgrupo de destino não encontrado.');
      if (activeProducts) {
        throw new BadRequestException(
          'Não é possível mover grupo com produtos ativos vinculados.',
        );
      }
    }

    const byCode = await this.prisma.group.findUnique({ where: { code } });
    if (byCode && byCode.id !== id) {
      throw new BadRequestException(`Código de grupo já existe: ${code}`);
    }

    return this.prisma.group.update({
      where: { id },
      data: { subgroupId, name, code, catalogCode, active: true },
    });
  }

  /** Inativa grupo com validação de dependências ativas. */
  async deactivateGroup(id: string) {
    const current = await this.prisma.group.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Grupo não encontrado.');
    const [productsCount, openRequestItemsCount] = await Promise.all([
      this.prisma.product.count({ where: { groupId: id, active: true } }),
      this.prisma.requestItem.count({
        where: { groupId: id, request: { closedAt: null } },
      }),
    ]);
    if (productsCount || openRequestItemsCount) {
      throw new BadRequestException(
        'Não é possível inativar grupo com produtos/solicitações ativas vinculadas.',
      );
    }
    await this.prisma.group.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }

  /** Atualiza centro de custo global (todas as linhas por hotel) usando o código como chave. */
  async updateCostCenter(codeParam: string, input: { code?: string; name?: string }) {
    const currentCode = normalizeUpper(codeParam);
    const nextCode = input.code ? normalizeUpper(input.code) : currentCode;
    const nextName = input.name ? normalizeUpper(input.name) : undefined;
    if (!currentCode) throw new BadRequestException('Código atual do centro é obrigatório.');

    const currentRows = await this.prisma.costCenter.findMany({
      where: { code: currentCode },
      select: { id: true, hotelId: true },
    });
    if (!currentRows.length) throw new NotFoundException('Centro de custo não encontrado.');

    if (nextCode !== currentCode) {
      const conflicts = await this.prisma.costCenter.count({
        where: {
          code: nextCode,
          hotelId: { in: currentRows.map((r) => r.hotelId) },
          id: { notIn: currentRows.map((r) => r.id) },
        },
      });
      if (conflicts) {
        throw new BadRequestException(
          `Já existe centro de custo com código ${nextCode} em um ou mais hotéis.`,
        );
      }
    }

    await this.prisma.costCenter.updateMany({
      where: { code: currentCode },
      data: {
        code: nextCode,
        ...(nextName ? { name: nextName } : {}),
        active: true,
      },
    });
    return { ok: true, code: nextCode, name: nextName ?? null };
  }

  /** Inativa centro de custo global (mesmo código em todos os hotéis). */
  async deactivateCostCenter(codeParam: string) {
    const code = normalizeUpper(codeParam);
    if (!code) throw new BadRequestException('Código do centro de custo é obrigatório.');

    const centers = await this.prisma.costCenter.findMany({
      where: { code },
      select: { id: true },
    });
    if (!centers.length) throw new NotFoundException('Centro de custo não encontrado.');
    const centerIds = centers.map((c) => c.id);

    const [activeProducts, openRequestItems] = await Promise.all([
      this.prisma.product.count({
        where: { active: true, OR: [{ costCenterId: { in: centerIds } }, { hotels: { some: { costCenterId: { in: centerIds } } } }] },
      }),
      this.prisma.requestItem.count({
        where: { costCenterId: { in: centerIds }, request: { closedAt: null } },
      }),
    ]);
    if (activeProducts || openRequestItems) {
      throw new BadRequestException(
        'Não é possível inativar centro de custo com produtos/solicitações ativas vinculadas.',
      );
    }
    await this.prisma.costCenter.updateMany({ where: { code }, data: { active: false } });
    return { ok: true };
  }

  /** Cria hotel / unidade operacional. */
  async createHotel(input: { code: string; name: string }) {
    const code = normalizeUpper(input.code);
    const name = normalizeUpper(input.name);
    if (!code) throw new BadRequestException('Código do hotel é obrigatório.');
    if (!name) throw new BadRequestException('Nome do hotel é obrigatório.');

    const exists = await this.prisma.hotel.findUnique({ where: { code } });
    if (exists) {
      if (exists.active) {
        throw new BadRequestException(`Código de hotel já existe: ${code}`);
      }
      return this.prisma.hotel.update({
        where: { id: exists.id },
        data: { name, active: true },
      });
    }
    return this.prisma.hotel.create({ data: { code, name, active: true } });
  }

  /** Atualiza hotel / unidade operacional. */
  async updateHotel(id: string, input: { code?: string; name?: string }) {
    const current = await this.prisma.hotel.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Hotel não encontrado.');
    const code = input.code ? normalizeUpper(input.code) : current.code;
    const name = input.name ? normalizeUpper(input.name) : current.name;
    if (code !== current.code) {
      const byCode = await this.prisma.hotel.findUnique({ where: { code } });
      if (byCode && byCode.id !== id) {
        throw new BadRequestException(`Código de hotel já existe: ${code}`);
      }
    }
    return this.prisma.hotel.update({
      where: { id },
      data: { code, name, active: true },
    });
  }

  /** Inativa hotel se não houver vínculos ativos. */
  async deactivateHotel(id: string) {
    const current = await this.prisma.hotel.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Hotel não encontrado.');
    const [openRequests, productLinks, users] = await Promise.all([
      this.prisma.request.count({
        where: {
          closedAt: null,
          OR: [{ hotelId: id }, { hotels: { some: { hotelId: id } } }],
        },
      }),
      this.prisma.productHotel.count({ where: { hotelId: id, product: { active: true } } }),
      this.prisma.user.count({ where: { hotelId: id, active: true } }),
    ]);
    if (openRequests || productLinks || users) {
      throw new BadRequestException(
        'Não é possível inativar hotel com solicitações abertas, produtos ativos ou usuários vinculados.',
      );
    }
    await this.prisma.hotel.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }

  /** Cria unidade de medida. */
  async createMeasureUnit(input: { code: string; name: string }) {
    const code = normalizeUpper(input.code);
    const name = normalizeUpper(input.name);
    if (!code) throw new BadRequestException('Código da unidade de medida é obrigatório.');
    if (!name) throw new BadRequestException('Nome da unidade de medida é obrigatório.');

    const exists = await this.prisma.measureUnit.findUnique({ where: { code } });
    if (exists) {
      if (exists.active) {
        throw new BadRequestException(`Código de unidade de medida já existe: ${code}`);
      }
      return this.prisma.measureUnit.update({
        where: { id: exists.id },
        data: { name, active: true },
      });
    }
    return this.prisma.measureUnit.create({ data: { code, name, active: true } });
  }

  /** Atualiza unidade de medida. */
  async updateMeasureUnit(id: string, input: { code?: string; name?: string }) {
    const current = await this.prisma.measureUnit.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Unidade de medida não encontrada.');
    const code = input.code ? normalizeUpper(input.code) : current.code;
    const name = input.name ? normalizeUpper(input.name) : current.name;
    if (code !== current.code) {
      const byCode = await this.prisma.measureUnit.findUnique({ where: { code } });
      if (byCode && byCode.id !== id) {
        throw new BadRequestException(`Código de unidade de medida já existe: ${code}`);
      }
    }
    return this.prisma.measureUnit.update({
      where: { id },
      data: { code, name, active: true },
    });
  }

  /** Inativa unidade de medida se não houver vínculos ativos. */
  async deactivateMeasureUnit(id: string) {
    const current = await this.prisma.measureUnit.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Unidade de medida não encontrada.');
    const [products, openItems] = await Promise.all([
      this.prisma.product.count({ where: { measureUnitId: id, active: true } }),
      this.prisma.requestItem.count({
        where: { measureUnitId: id, request: { closedAt: null } },
      }),
    ]);
    if (products || openItems) {
      throw new BadRequestException(
        'Não é possível inativar unidade de medida com produtos/solicitações ativas vinculadas.',
      );
    }
    await this.prisma.measureUnit.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }
}
