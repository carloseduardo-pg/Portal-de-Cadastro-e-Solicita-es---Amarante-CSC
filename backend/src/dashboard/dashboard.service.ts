import { Injectable } from '@nestjs/common';
import { RequestState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summaryProducts() {
    const [inbox, slaOverdue, products, families, recent] = await Promise.all([
      this.prisma.request.count({
        where: {
          state: {
            in: [
              RequestState.SOLICITANTE,
              RequestState.APROVADOR,
              RequestState.COMPLIANCE,
            ],
          },
        },
      }),
      this.prisma.requestStage.count({ where: { isLate: true, finishedAt: null } }),
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.family.count({ where: { active: true } }),
      this.prisma.request.findMany({
        where: {
          state: {
            in: [
              RequestState.SOLICITANTE,
              RequestState.APROVADOR,
              RequestState.COMPLIANCE,
            ],
          },
        },
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: {
          family: { select: { name: true } },
          items: { select: { descriptionShort: true }, take: 1 },
        },
      }),
    ]);

    return {
      inbox,
      slaOverdue,
      products,
      families,
      slaOverdueRatio: inbox > 0 ? slaOverdue / inbox : 0,
      recent,
    };
  }
}
