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
    let created = 0;
    for (const deal of deals) {
      try {
        if (!deal.organizationId || deal.interestPaymentDay === null) continue;

        const lastPayment = await this.prisma.interestPayment.findFirst({
          where: { dealId: deal.id },
          orderBy: { paidDate: 'desc' },
          select: { paidDate: true },
        });
        const status = computeInterestPaymentStatus(deal.interestPaymentDay, lastPayment?.paidDate ?? null, now);
        if (status.level !== 'OVERDUE') continue;

        const dueDateLabel = status.currentDueDate.toLocaleDateString('fr-FR');
        const alertTitle = `Paiement d'intérêts en retard — ${deal.reference} (échéance ${dueDateLabel})`;
        const existingAlert = await this.prisma.alert.findFirst({
          where: { organizationId: deal.organizationId, dealId: deal.id, title: alertTitle },
        });
        if (existingAlert) continue;

        await this.alerts.create(deal.organizationId, {
          title: alertTitle,
          message: `${deal.name} — paiement des intérêts non constaté depuis ${status.daysOverdue} jour(s) après l'échéance du ${dueDateLabel}.`,
          severity: 'CRITICAL',
          dealId: deal.id,
        });
        created += 1;
      } catch (err) {
        this.logger.error(`Échec du contrôle de paiement d'intérêts pour le deal ${deal.id}`, err instanceof Error ? err.stack : err);
      }
    }
    if (created > 0) this.logger.log(`${created} nouvelle(s) alerte(s) de paiement d'intérêts en retard créée(s).`);
  }
}
