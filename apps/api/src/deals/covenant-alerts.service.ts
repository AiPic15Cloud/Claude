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

    let created = 0;
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

        const breaches: string[] = [];
        if (covenants.ltvBreached) breaches.push(`LTV ${covenants.ltvPct}% > seuil ${covenants.ltvThresholdPct}%`);
        if (covenants.icrBreached) breaches.push(`ICR ${covenants.icr}x < seuil ${covenants.icrThreshold}x`);
        if (covenants.dscrBreached) breaches.push(`DSCR ${covenants.dscr}x < seuil ${covenants.dscrThreshold}x`);
        if (breaches.length === 0) continue;

        const title = `${TASK_TITLE_PREFIX} — ${deal.reference}`;
        const message = breaches.join(' · ');

        // Contrairement à la durée cible (monotone : une fois dépassée, le
        // seul retour à la normale possible est une prorogation qui change
        // le calcul lui-même), un covenant peut se rétablir (remboursement)
        // puis se rompre de nouveau plus tard (nouveau tirage, dévalorisation,
        // ratio différent) — dédupliquer par titre pour toujours aurait
        // rendu muet tout nouveau franchissement une fois la toute première
        // alerte créée, même des semaines après sa lecture. On ne déduplique
        // donc que contre une alerte non lue : une fois acquittée, un
        // contrôle ultérieur qui trouve encore (ou de nouveau) une rupture
        // recrée une alerte.
        const existingAlert = await this.prisma.alert.findFirst({
          where: { organizationId: deal.organizationId, dealId: deal.id, title, read: false },
        });
        if (!existingAlert) {
          await this.alerts.create(deal.organizationId, { title, message, severity: 'CRITICAL', dealId: deal.id });
          created += 1;
        }

        // Même logique côté tâche, mais sur son propre statut (done) plutôt
        // que celui de l'alerte — les deux ont des cycles de vie distincts.
        const existingTask = await this.prisma.task.findFirst({ where: { dealId: deal.id, title, done: false } });
        if (!existingTask) {
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
        this.logger.error(`Échec du contrôle de covenant pour le deal ${deal.id}`, err instanceof Error ? err.stack : err);
      }
    }
    if (created > 0) this.logger.log(`${created} rupture(s) de covenant détectée(s).`);
  }
}
