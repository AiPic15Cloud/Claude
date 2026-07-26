import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fees are bucketed by the deal's signing date (startDate); deals that
   * never had one recorded fall back to their creation date so nothing
   * with a non-zero fee is silently dropped from the chart.
   */
  async summary(organizationId: string, year: number) {
    const [deals, target] = await Promise.all([
      this.prisma.deal.findMany({
        where: { organizationId, feesAmount: { gt: 0 } },
        select: { feesAmount: true, startDate: true, createdAt: true },
      }),
      this.prisma.feesTarget.findUnique({ where: { organizationId_year: { organizationId, year } } }),
    ]);

    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 }));
    let annualActual = 0;

    for (const deal of deals) {
      const bucketDate = deal.startDate ?? deal.createdAt;
      if (bucketDate.getFullYear() !== year) continue;
      const amount = Number(deal.feesAmount);
      monthly[bucketDate.getMonth()].amount += amount;
      annualActual += amount;
    }

    const annualTarget = target ? Number(target.targetAmount) : null;

    return {
      year,
      monthly,
      annualActual,
      annualTarget,
      progressPct: annualTarget && annualTarget > 0 ? Math.round((annualActual / annualTarget) * 1000) / 10 : null,
    };
  }

  async setTarget(organizationId: string, year: number, targetAmount: number) {
    const target = await this.prisma.feesTarget.upsert({
      where: { organizationId_year: { organizationId, year } },
      update: { targetAmount },
      create: { organizationId, year, targetAmount },
    });
    return { ...target, targetAmount: Number(target.targetAmount) };
  }
}
