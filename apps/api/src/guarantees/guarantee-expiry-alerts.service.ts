import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { computeGuaranteeExpiry, isExpirableGuaranteeType } from './guarantee-expiry.util';

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;

/**
 * Warns 6 months ahead of an hypothèque/fiducie/caution's end date so the
 * team has time to renew it — mirrors DeadlineAlertsService's pattern
 * (boot + 6h interval, dedupe by Alert title) but scoped to guarantees
 * instead of deals, and without the escalation-Task side effect (only a
 * ⚠️ + notification was asked for here, not a to-do workflow).
 */
@Injectable()
export class GuaranteeExpiryAlertsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GuaranteeExpiryAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  onApplicationBootstrap() {
    void this.checkAll();
    setInterval(() => void this.checkAll(), CHECK_INTERVAL_MS);
  }

  private async checkAll() {
    // A guarantee on a repaid or defaulted deal has nothing left to renew
    // for — same closed-deal condition as isDealClosed(), applied directly
    // in the query so those guarantees are never even fetched.
    const guarantees = await this.prisma.guarantee.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { not: null },
        deal: { repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] } },
      },
      select: {
        id: true,
        type: true,
        description: true,
        endDate: true,
        dealId: true,
        deal: { select: { organizationId: true, name: true, reference: true } },
      },
    });

    let created = 0;
    for (const guarantee of guarantees) {
      try {
        if (!isExpirableGuaranteeType(guarantee.type)) continue;

        const expiry = computeGuaranteeExpiry(guarantee.type, guarantee.endDate);
        // Non-expiring, or expiring but outside the 6-month window: nothing to raise.
        // Once truly expired (NON_VALIDE) we still want a notification — that's
        // the point where the collateral has actually lapsed.
        if (expiry.validity === 'VALIDE' && !expiry.expiringSoon) continue;

        const organizationId = guarantee.deal.organizationId;
        const alertTitle =
          expiry.validity === 'NON_VALIDE'
            ? `Garantie expirée — ${guarantee.deal.reference}`
            : `Renouvellement à prévoir — ${guarantee.deal.reference}`;
        const existingAlert = await this.prisma.alert.findFirst({
          where: { organizationId, dealId: guarantee.dealId, title: alertTitle },
        });
        if (existingAlert) continue;

        const daysLabel =
          expiry.validity === 'NON_VALIDE'
            ? 'a expiré'
            : `expire dans ${expiry.daysToExpiry} jour(s)`;
        await this.alerts.create(organizationId, {
          title: alertTitle,
          message: `${guarantee.deal.name} — ${guarantee.description} (${guarantee.type}) ${daysLabel}. Pensez à la renouveler.`,
          severity: expiry.validity === 'NON_VALIDE' ? 'CRITICAL' : 'WARNING',
          dealId: guarantee.dealId,
        });
        created += 1;
      } catch (err) {
        this.logger.error(
          `Échec du traitement de l'échéance de garantie ${guarantee.id}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
    if (created > 0) this.logger.log(`${created} nouvelle(s) alerte(s) d'expiration de garantie créée(s).`);
  }
}
