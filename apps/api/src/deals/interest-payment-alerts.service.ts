import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { computeInterestPaymentStatus } from './interest-payment.util';

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;

/**
 * Notifie quand le paiement mensuel des intérêts n'est pas constaté à
 * l'échéance (Deal.repaymentMode = MENSUEL) — mirrors DeadlineAlertsService/
 * GuaranteeExpiryAlertsService (boot + 6h interval, dedupe par titre
 * d'Alert), sans le volet Task (seule une notification a été demandée ici).
 * Le titre inclut la date d'échéance du cycle pour que l'alerte du mois
 * suivant ne soit jamais masquée par celle, déjà vue, du mois précédent.
 */
@Injectable()
export class InterestPaymentAlertsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InterestPaymentAlertsService.name);

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
      where: { status: 'ACTIVE', repaymentMode: 'MENSUEL', interestPaymentDay: { not: null }, repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] } },
      select: { id: true, organizationId: true, name: true, reference: true, interestPaymentDay: true },
    });

    const now = new Date();
    const dealIds = deals.map((d) => d.id);

    // Dernier paiement par deal en un seul groupBy plutôt qu'un findFirst
    // par deal (N+1) — seule la date la plus récente nous intéresse ici,
    // exactement ce qu'exprime _max.
    const lastPayments = dealIds.length
      ? await this.prisma.interestPayment.groupBy({ by: ['dealId'], where: { dealId: { in: dealIds } }, _max: { paidDate: true } })
      : [];
    const lastPaymentByDeal = new Map(lastPayments.map((p) => [p.dealId, p._max.paidDate]));

    const overdue: { deal: (typeof deals)[number]; title: string; message: string }[] = [];
    for (const deal of deals) {
      if (!deal.organizationId || deal.interestPaymentDay === null) continue;
      const status = computeInterestPaymentStatus(deal.interestPaymentDay, lastPaymentByDeal.get(deal.id) ?? null, now);
      if (status.level !== 'OVERDUE') continue;

      const dueDateLabel = status.currentDueDate.toLocaleDateString('fr-FR');
      overdue.push({
        deal,
        title: `Paiement d'intérêts en retard — ${deal.reference} (échéance ${dueDateLabel})`,
        message: `${deal.name} — paiement des intérêts non constaté depuis ${status.daysOverdue} jour(s) après l'échéance du ${dueDateLabel}.`,
      });
    }

    if (overdue.length === 0) return;

    // Idem pour la vérification d'existence : un findMany groupé sur les
    // seuls deals réellement en retard plutôt qu'un findFirst par deal.
    const existingAlerts = await this.prisma.alert.findMany({
      where: { dealId: { in: overdue.map((o) => o.deal.id) } },
      select: { dealId: true, title: true },
    });
    const existingAlertKeys = new Set(existingAlerts.map((a) => `${a.dealId}::${a.title}`));

    let created = 0;
    for (const { deal, title, message } of overdue) {
      try {
        if (existingAlertKeys.has(`${deal.id}::${title}`)) continue;
        await this.alerts.create(deal.organizationId, { title, message, severity: 'CRITICAL', dealId: deal.id });
        created += 1;
      } catch (err) {
        this.logger.error(`Échec du contrôle de paiement d'intérêts pour le deal ${deal.id}`, err instanceof Error ? err.stack : err);
      }
    }
    if (created > 0) this.logger.log(`${created} nouvelle(s) alerte(s) de paiement d'intérêts en retard créée(s).`);
  }
}
