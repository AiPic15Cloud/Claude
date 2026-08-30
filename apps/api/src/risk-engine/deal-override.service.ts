import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { RiskEngineService } from './risk-engine.service';

/**
 * Override analyste du statut de surveillance CALCULÉ — un jugement humain
 * explicite, distinct de RiskOverride (règle objective, sans utilisateur) et
 * de DataValidation (simple attestation que rien n'a changé). Contrairement
 * au moteur automatique, celui-ci ne s'efface jamais tout seul : reste actif
 * jusqu'à ce que l'analyste appelle explicitement clear() ("Lever
 * l'override").
 */
@Injectable()
export class DealOverrideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly riskEngine: RiskEngineService,
  ) {}

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true, surveillanceStatus: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  async set(organizationId: string, dealId: string, userId: string, overrideStatus: import('@prisma/client').DealSurveillanceStatus, justification: string) {
    const deal = await this.assertDeal(organizationId, dealId);

    // Un nouvel override remplace le précédent — jamais deux overrides actifs
    // en même temps sur le même dossier.
    await this.prisma.dealOverride.updateMany({ where: { dealId, active: true }, data: { active: false } });

    const created = await this.prisma.dealOverride.create({
      data: {
        organizationId,
        dealId,
        automaticStatus: deal.surveillanceStatus ?? 'PERFORMING',
        overrideStatus,
        justification,
        createdById: userId,
      },
    });

    await this.activities.log(dealId, userId, 'ANALYST_OVERRIDE_SET', `Statut de surveillance forcé à ${overrideStatus} : ${justification}`);
    await this.riskEngine.recomputeAndPersist(organizationId, dealId);

    return created;
  }

  async clear(organizationId: string, dealId: string, userId: string): Promise<void> {
    await this.assertDeal(organizationId, dealId);
    const active = await this.prisma.dealOverride.findFirst({ where: { dealId, active: true } });
    if (!active) return;

    await this.prisma.dealOverride.update({ where: { id: active.id }, data: { active: false, clearedAt: new Date(), clearedById: userId } });
    await this.activities.log(dealId, userId, 'ANALYST_OVERRIDE_SET', "Override du statut de surveillance levé — retour au statut automatique.");
    await this.riskEngine.recomputeAndPersist(organizationId, dealId);
  }

  getActive(organizationId: string, dealId: string) {
    return this.prisma.dealOverride.findFirst({
      where: { dealId, organizationId, active: true },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getHistory(organizationId: string, dealId: string) {
    await this.assertDeal(organizationId, dealId);
    const [riskOverrides, dealOverrides] = await Promise.all([
      this.prisma.riskOverride.findMany({ where: { dealId, organizationId }, orderBy: { triggeredAt: 'desc' } }),
      this.prisma.dealOverride.findMany({
        where: { dealId, organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          clearedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);
    return { riskOverrides, dealOverrides };
  }
}
