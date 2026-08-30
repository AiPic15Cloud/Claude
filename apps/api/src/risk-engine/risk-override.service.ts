import { Injectable } from '@nestjs/common';
import type { DealSurveillanceStatus, RiskOverride } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { HARD_OVERRIDE_RULES, type HardOverrideDealState } from './hard-override-rules';

export interface RiskOverrideEvaluation {
  active: RiskOverride[];
  floors: DealSurveillanceStatus[];
}

/**
 * Évalue HARD_OVERRIDE_RULES à chaque recalcul et ouvre/résout les lignes
 * RiskOverride en conséquence. Les événements automatiques n'ont pas
 * d'utilisateur réel à qui attribuer une Activity (userId non nullable sur
 * ce modèle) — même convention que CompanyMonitoringService/
 * DeadlineAlertsService : une Alert (dédupliquée par titre) plutôt qu'une
 * Activity porte la notification, la ligne RiskOverride elle-même reste la
 * trace d'audit complète (règle, libellé figé, horodatage d'ouverture/résolution).
 */
@Injectable()
export class RiskOverrideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  async evaluate(organizationId: string, dealId: string, dealName: string, dealReference: string, state: HardOverrideDealState): Promise<RiskOverrideEvaluation> {
    const existing = await this.prisma.riskOverride.findMany({ where: { dealId, active: true } });
    const existingByKey = new Map(existing.map((o) => [o.ruleKey, o]));

    for (const rule of HARD_OVERRIDE_RULES) {
      const isTrue = rule.condition(state);
      const current = existingByKey.get(rule.key);

      if (isTrue && !current) {
        await this.prisma.riskOverride.create({
          data: { organizationId, dealId, ruleKey: rule.key, label: rule.label, minimumSurveillanceStatus: rule.minimumSurveillanceStatus },
        });
        await this.notify(organizationId, dealId, dealName, dealReference, rule.label, true);
      } else if (!isTrue && current) {
        await this.prisma.riskOverride.update({ where: { id: current.id }, data: { active: false, resolvedAt: new Date() } });
        await this.notify(organizationId, dealId, dealName, dealReference, rule.label, false);
      }
    }

    const active = await this.prisma.riskOverride.findMany({ where: { dealId, active: true } });
    return { active, floors: active.map((o) => o.minimumSurveillanceStatus) };
  }

  private async notify(organizationId: string, dealId: string, dealName: string, dealReference: string, ruleLabel: string, triggered: boolean) {
    const dateSuffix = new Date().toLocaleDateString('fr-FR');
    const title = triggered
      ? `Risque : règle critique déclenchée — ${dealReference} (${dateSuffix})`
      : `Risque : règle critique résolue — ${dealReference} (${dateSuffix})`;

    const existing = await this.prisma.alert.findFirst({ where: { organizationId, dealId, title } });
    if (existing) return;

    await this.alerts.create(organizationId, {
      title,
      message: triggered ? `${dealName} : ${ruleLabel}.` : `${dealName} : la condition "${ruleLabel}" n'est plus vraie.`,
      severity: triggered ? 'CRITICAL' : 'WARNING',
      dealId,
    });
  }
}
