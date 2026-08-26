import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { pageResult, skipTake, type PageParams } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [active, pending, inbox] = await Promise.all([
      this.prisma.supplier.count({ where: { active: true } }),
      this.prisma.supplierRequest.count({ where: { state: 'APROVADOR' } }),
      this.prisma.supplierRequest.count(),
    ]);
    return { active, pending, inbox };
  }

  async findBase(params: { search?: string } & PageParams) {
    const where: Prisma.SupplierWhereInput = { active: true };
    if (params.search) {
      where.OR = [
        { corporateName: { contains: params.search, mode: 'insensitive' } },
        { document: { contains: params.search.replace(/\D/g, '') } },
      ];
    }
    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({ where, orderBy: { corporateName: 'asc' }, skip, take }),
    ]);
    return pageResult(data, total, params);
  }

  async findInactive(params: PageParams) {
    const { skip, take } = skipTake(params);
    const where = { active: false };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({ where, orderBy: { corporateName: 'asc' }, skip, take }),
    ]);
    return pageResult(data, total, params);
  }

  async findRequests(params: { state?: string; mine?: string; userId?: string } & PageParams) {
    const where: Prisma.SupplierRequestWhereInput = {};
    if (params.state) where.state = params.state as Prisma.SupplierRequestWhereInput['state'];
    if (params.mine === 'true' && params.userId) where.requesterId = params.userId;

    const { skip, take } = skipTake(params);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.supplierRequest.count({ where }),
      this.prisma.supplierRequest.findMany({
        where,
        include: {
          requester: { select: { name: true } },
          supplier: { select: { corporateName: true, document: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return pageResult(data, total, params);
  }

  async findOne(id: string) {
    return this.prisma.supplier.findUniqueOrThrow({ where: { id } });
  }
}
