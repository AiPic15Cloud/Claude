import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { TasksService } from '../tasks/tasks.service';
import { computeCrdDetailed } from './crd.util';
import { computeCovenants } from './covenant.util';

const TASK_TITLE_PREFIX = 'Rupture de covenant';

/**
 * Détection de rupture de covenant (spec ATLAS v2, module MARKO F.3) —
 * "franchissement de seuil = tâche automatique", même doctrine que
 * DurationTargetAlertsService pour la durée cible. Un seul contrôle
 * quotidien : LTV/ICR/DSCR ne varient pas assez vite (CRD évolue au
 * remboursement, pas en continu) pour justifier un cycle plus court.
 */
@Injectable()
export class CovenantAlertsService {
  private readonly logger = new Logger(CovenantAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly tasks: TasksService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkAll(): Promise<void> {
    const deals = await this.prisma.deal.findMany({
      where: { status: 'ACTIVE', stage: { notIn: ['REMBOURSE', 'DEFAUT'] } },
      select: {
        id: true,
        organizationId: true,
        reference: true,
        type: true,
        amountRaised: true,
        interestRate: true,
        startDate: true,
        dateEcheanceInitiale: true,
        endDate: true,
        assignedToId: true,
        createdById: true,
      },
    });

    // La rupture elle-même dépend d'un calcul par deal (CRD détaillé,
    // extensions, hypothèses financières) qui reste par deal — seule la
    // double vérification d'existence (alerte + tâche) qui suivait chaque
    // rupture est batchée ci-dessous, une fois la liste des deals en
    // rupture connue, au lieu d'un findFirst par deal en rupture (N+1).
    const breachingDeals: { deal: (typeof deals)[number]; title: string; message: string }[] = [];

    for (const deal of deals) {
      try {
        const [realizedRepayments, loanExtensions, financialAssumption] = await Promise.all([
          this.prisma.repayment.findMany({ where: { dealId: deal.id, projected: false }, select: { date: true, amount: true } }),
          this.prisma.loanExtension.findMany({
            where: { dealId: deal.id },
            orderBy: { dateSignature: 'asc' },
            select: { dateSignature: true, nouvelleDateEcheance: true },
          }),
          this.prisma.financialAssumption.findUnique({
            where: { dealId: deal.id },
            select: { surfaceSqm: true, sellingPricePerSqm: true, resultatOperationnelEstime: true, fluxTresorerieDisponibleEstime: true },
          }),
        ]);

        const crdDetailed = computeCrdDetailed(
          Number(deal.amountRaised),
          deal.interestRate ? Number(deal.interestRate) : null,
          deal.startDate,
          realizedRepayments.map((r) => ({ date: r.date, amount: Number(r.amount) })),
          new Date(),
          { dateEcheanceInitiale: deal.dateEcheanceInitiale ?? deal.endDate, extensions: loanExtensions },
        );

        const valeurSortieVisee = financialAssumption
          ? Number(financialAssumption.surfaceSqm) * Number(financialAssumption.sellingPricePerSqm)
          : null;

        const covenants = computeCovenants({
          dealType: deal.type,
          crdTotal: crdDetailed.crdTotal,
          crdInteretsCourus: crdDetailed.crdInteretsCourus,
          valeurSortieVisee,
          resultatOperationnelEstime: financialAssumption?.resultatOperationnelEstime != null ? Number(financialAssumption.resultatOperationnelEstime) : null,
          fluxTresorerieDisponibleEstime:
            financialAssumption?.fluxTresorerieDisponibleEstime != null ? Number(financialAssumption.fluxTresorerieDisponibleEstime) : null,
        });

        const dealBreaches: string[] = [];
        if (covenants.ltvBreached) dealBreaches.push(`LTV ${covenants.ltvPct}% > seuil ${covenants.ltvThresholdPct}%`);
        if (covenants.icrBreached) dealBreaches.push(`ICR ${covenants.icr}x < seuil ${covenants.icrThreshold}x`);
        if (covenants.dscrBreached) dealBreaches.push(`DSCR ${covenants.dscr}x < seuil ${covenants.dscrThreshold}x`);
        if (dealBreaches.length === 0) continue;

        breachingDeals.push({ deal, title: `${TASK_TITLE_PREFIX} — ${deal.reference}`, message: dealBreaches.join(' · ') });
      } catch (err) {
        this.logger.error(`Échec du contrôle de covenant pour le deal ${deal.id}`, err instanceof Error ? err.stack : err);
      }
    }

    if (breachingDeals.length === 0) return;

    const breachingDealIds = breachingDeals.map((b) => b.deal.id);
    // Contrairement à la durée cible (monotone : une fois dépassée, le seul
    // retour à la normale possible est une prorogation qui change le calcul
    // lui-même), un covenant peut se rétablir (remboursement) puis se
    // rompre de nouveau plus tard (nouveau tirage, dévalorisation, ratio
    // différent) — dédupliquer par titre pour toujours aurait rendu muet
    // tout nouveau franchissement une fois la toute première alerte créée,
    // même des semaines après sa lecture. On ne déduplique donc que contre
    // une alerte non lue : une fois acquittée, un contrôle ultérieur qui
    // trouve encore (ou de nouveau) une rupture recrée une alerte. Même
    // logique côté tâche, mais sur son propre statut (done) plutôt que
    // celui de l'alerte — les deux ont des cycles de vie distincts.
    const [existingAlerts, existingTasks] = await Promise.all([
      this.prisma.alert.findMany({ where: { dealId: { in: breachingDealIds }, read: false }, select: { dealId: true, title: true } }),
      this.prisma.task.findMany({ where: { dealId: { in: breachingDealIds }, done: false }, select: { dealId: true, title: true } }),
    ]);
    const existingAlertKeys = new Set(existingAlerts.map((a) => `${a.dealId}::${a.title}`));
    const existingTaskKeys = new Set(existingTasks.map((t) => `${t.dealId}::${t.title}`));

    let created = 0;
    for (const { deal, title, message } of breachingDeals) {
      try {
        if (!existingAlertKeys.has(`${deal.id}::${title}`)) {
          await this.alerts.create(deal.organizationId, { title, message, severity: 'CRITICAL', dealId: deal.id });
          created += 1;
        }

        if (!existingTaskKeys.has(`${deal.id}::${title}`)) {
          const assigneeId = deal.assignedToId ?? deal.createdById;
          await this.tasks.create(deal.organizationId, assigneeId, {
            title,
            dealId: deal.id,
            priority: 'URGENT',
            dueDate: new Date().toISOString().slice(0, 10),
            assigneeId,
            typeTache: 'FINANCE',
          });
        }
      } catch (err) {
        this.logger.error(`Échec de la création d'alerte/tâche de covenant pour le deal ${deal.id}`, err instanceof Error ? err.stack : err);
      }
    }
    if (created > 0) this.logger.log(`${created} rupture(s) de covenant détectée(s).`);
  }
}
