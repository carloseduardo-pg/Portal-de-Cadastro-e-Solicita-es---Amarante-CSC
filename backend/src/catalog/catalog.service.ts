import { Injectable } from '@nestjs/common';
import { pageResult, skipTake, type PageParams } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  hotels() {
    return this.prisma.hotel.findMany({ where: { active: true }, orderBy: { code: 'asc' } });
  }

  /**
   * Famílias SAP (nível mais amplo). Opcionalmente filtra por texto.
   */
  async families(params: { search?: string } & PageParams) {
    const where = {
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' as const } },
              { code: { contains: params.search } },
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
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);
    return pageResult(
      data.map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
        attributesCount: f._count.productAttributes,
        subgroupsCount: f._count.subgroups,
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

  /** Grupos de itens (folha). Filtra por subgrupo quando informado. */
  async groups(params: { subgroupId?: string } & PageParams) {
    const where = params.subgroupId ? { subgroupId: params.subgroupId } : {};
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.group.count({ where }),
      this.prisma.group.findMany({
        where,
        include: { subgroup: { select: { id: true, code: true, name: true, familyId: true } } },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);
    return pageResult(
      data.map((g) => ({
        id: g.id,
        code: g.code,
        name: g.name,
        subgroupId: g.subgroupId,
        familyId: g.subgroup.familyId,
        subgroup: g.subgroup,
      })),
      total,
      params,
    );
  }

  /** Subgrupos. Filtra por família (SAP) quando informado. */
  async subgroups(params: { familyId?: string } & PageParams) {
    const where = params.familyId ? { familyId: params.familyId } : {};
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.subgroup.count({ where }),
      this.prisma.subgroup.findMany({
        where,
        include: { family: { select: { id: true, code: true, name: true } } },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip,
        take,
      }),
    ]);
    return pageResult(
      data.map((sg) => ({
        id: sg.id,
        code: sg.code,
        name: sg.name,
        familyId: sg.familyId,
        family: sg.family,
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
