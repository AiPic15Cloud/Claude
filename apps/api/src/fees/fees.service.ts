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

  /**
   * A transparent, clearly-labelled estimate — not a promise. Validated
   * pipeline entries are assumed to convert in full; entries still awaiting
   * committee are weighted by the org's historical validation rate. Both
   * are then multiplied by the average fees rate actually set on existing
   * deals (0 if none have one yet, in which case the projection is 0 too).
   *
   * Until the org has at least one committee decision (VALIDE/REFUSE), there
   * is no historical rate to weight by — defaulting that to 0% would zero
   * out the entire pending pipeline and make the projection ignore every
   * dossier just entered. Instead a neutral 50% prior is used until real
   * history accumulates, and `conversionRateIsDefault` tells the frontend to
   * label it as an assumption rather than a measured rate.
   */
  async projection(organizationId: string) {
    const [feesRates, pipelineEntries] = await Promise.all([
      this.prisma.deal.findMany({ where: { organizationId, feesRate: { not: null } }, select: { feesRate: true } }),
      this.prisma.pipelineEntry.findMany({ where: { organizationId }, select: { amount: true, committee: true } }),
    ]);

    const avgFeesRate = feesRates.length
      ? feesRates.reduce((sum, d) => sum + Number(d.feesRate), 0) / feesRates.length
      : 0;

    const validated = pipelineEntries.filter((e) => e.committee === 'VALIDE');
    const pending = pipelineEntries.filter((e) => e.committee === 'PAS_DE_COMITE' || e.committee === 'CONDITIONS_SUSPENSIVES');
    const decided = pipelineEntries.filter((e) => e.committee === 'VALIDE' || e.committee === 'REFUSE');
    const conversionRateIsDefault = decided.length === 0;
    const conversionRate = decided.length ? validated.length / decided.length : 0.5;

    const pipelineValidatedAmount = validated.reduce((sum, e) => sum + Number(e.amount), 0);
    const pipelinePendingAmount = pending.reduce((sum, e) => sum + Number(e.amount), 0);
    const weightedPipelineAmount = pipelineValidatedAmount + pipelinePendingAmount * conversionRate;
    const projectedFees = Math.round(weightedPipelineAmount * (avgFeesRate / 100));

    return {
      avgFeesRate: Math.round(avgFeesRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 1000) / 10,
      conversionRateIsDefault,
      pipelineValidatedAmount,
      pipelinePendingAmount,
      projectedFees,
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
