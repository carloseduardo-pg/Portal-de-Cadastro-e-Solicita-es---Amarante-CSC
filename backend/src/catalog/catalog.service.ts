import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  hotels() {
    return this.prisma.hotel.findMany({ where: { active: true }, orderBy: { code: 'asc' } });
  }

  /**
   * Famílias SAP (nível mais amplo). Contagem de itens + flags de anomalia de importação.
   */
  async families(params: {
    search?: string;
    itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
  } & PageParams) {
    const search = params.search?.trim();
    const where: Prisma.FamilyWhereInput = {
      active: true,
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
      const rows = await this.prisma.$queryRaw<{ family_id: string; n: bigint }[]>`
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
    } & PageParams,
  ) {
    const search = params.search?.trim();
    const where: Prisma.GroupWhereInput = {
      active: true,
      ...(params.subgroupId ? { subgroupId: params.subgroupId } : {}),
      ...(params.itemKind
        ? { subgroup: { family: { itemKind: params.itemKind } } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              {
                subgroup: {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { family: { name: { contains: search, mode: 'insensitive' } } },
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
              family: { select: { id: true, code: true, name: true, itemKind: true } },
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
      const rows = await this.prisma.$queryRaw<{ group_id: string; n: bigint }[]>`
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
        name: g.name,
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
    } & PageParams,
  ) {
    const search = params.search?.trim();
    const where: Prisma.SubgroupWhereInput = {
      active: true,
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
          family: { select: { id: true, code: true, name: true, itemKind: true } },
          _count: { select: { groups: true } },
        },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);

    const countMap = new Map<string, number>();
    if (data.length) {
      const rows = await this.prisma.$queryRaw<{ subgroup_id: string; n: bigint }[]>`
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

  async measureUnits(params: PageParams) {
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.measureUnit.count(),
      this.prisma.measureUnit.findMany({
        where: { active: true },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }

  costCenters(hotelId?: string, hotelIds?: string) {
    const ids = hotelIds?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    const where =
      ids.length > 0
        ? { hotelId: { in: ids }, active: true }
        : { active: true, ...(hotelId ? { hotelId } : {}) };
    return this.prisma.costCenter.findMany({
      where,
      orderBy: [{ hotel: { name: 'asc' } }, { name: 'asc' }, { code: 'asc' }],
      include: { hotel: { select: { id: true, code: true, name: true } } },
    });
  }

  async warehouses(params: PageParams) {
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.warehouse.count(),
      this.prisma.warehouse.findMany({
        include: { hotel: true },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }
}
