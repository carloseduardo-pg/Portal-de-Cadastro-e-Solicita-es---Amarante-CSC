import { Injectable } from '@nestjs/common';
import { pageResult, skipTake, type PageParams } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  hotels() {
    return this.prisma.hotel.findMany({ where: { active: true }, orderBy: { code: 'asc' } });
  }

  async families(params: { search?: string; subgroupId?: string } & PageParams) {
    const where = {
      ...(params.subgroupId ? { subgroupId: params.subgroupId } : {}),
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
          subgroup: { include: { group: true } },
          _count: { select: { productAttributes: true } },
        },
        orderBy: { code: 'asc' },
        skip,
        take,
      }),
    ]);
    return pageResult(
      data.map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
        subgroupId: f.subgroupId,
        groupId: f.subgroup.group.id,
        groupCode: f.subgroup.group.code,
        groupName: f.subgroup.group.name,
        subgroupCode: f.subgroup.code,
        subgroupName: f.subgroup.name,
        attributesCount: f._count.productAttributes,
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

  async groups(params: PageParams) {
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.group.count(),
      this.prisma.group.findMany({ orderBy: { code: 'asc' }, skip, take }),
    ]);
    return pageResult(data, total, params);
  }

  async subgroups(params: { groupId?: string } & PageParams) {
    const where = params.groupId ? { groupId: params.groupId } : {};
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.subgroup.count({ where }),
      this.prisma.subgroup.findMany({
        where,
        include: { group: true },
        orderBy: { code: 'asc' },
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }

  async measureUnits(params: PageParams) {
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.measureUnit.count(),
      this.prisma.measureUnit.findMany({ where: { active: true }, orderBy: { code: 'asc' }, skip, take }),
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
      orderBy: [{ hotel: { code: 'asc' } }, { code: 'asc' }],
      include: { hotel: { select: { id: true, code: true, name: true } } },
    });
  }

  async warehouses(params: PageParams) {
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.warehouse.count(),
      this.prisma.warehouse.findMany({
        include: { hotel: true },
        orderBy: { code: 'asc' },
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }
}
