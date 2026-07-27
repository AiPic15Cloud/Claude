import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { computeDeadlineAlert } from './deadline.util';

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;

/**
 * Surfaces the same J-90/J-60/J-30/J-15/contentieux échéance thresholds
 * already computed for Cockpit as real notifications in the alerts bell.
 * One Alert per (deal, stage) — the title embeds the stage, so once a
 * threshold has been notified it's never re-created, only the next
 * threshold crossed produces a new alert.
 */
@Injectable()
export class DeadlineAlertsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DeadlineAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  onApplicationBootstrap() {
    void this.checkAll();
    setInterval(() => void this.checkAll(), CHECK_INTERVAL_MS);
  }

  private async checkAll() {
    const deals = await this.prisma.deal.findMany({
      where: { status: 'ACTIVE', dateMax: { not: null } },
      select: { id: true, organizationId: true, name: true, reference: true, dateMax: true },
    });

    let created = 0;
    for (const deal of deals) {
      const alert = computeDeadlineAlert(deal.dateMax);
      if (alert.level === 'RAS' || !alert.stage) continue;

      const title = `Échéance ${alert.stage} — ${deal.reference}`;
      const existing = await this.prisma.alert.findFirst({
        where: { organizationId: deal.organizationId, dealId: deal.id, title },
      });
      if (existing) continue;

      await this.alerts.create(deal.organizationId, {
        title,
        message: `${deal.name} — ${alert.actionLabel}`,
        severity: alert.level === 'URGENT' ? 'CRITICAL' : 'WARNING',
        dealId: deal.id,
      });
      created += 1;
    }
    if (created > 0) this.logger.log(`${created} nouvelle(s) alerte(s) d'échéance créée(s).`);
  }
}
