import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { TasksService } from '../tasks/tasks.service';
import { computeDurationTargetAlert, type DurationTargetAlert } from './duration-target.util';

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;
const TASK_TITLE_PREFIX = 'Point durée cible';

const STAGE_TASK: Record<Exclude<DurationTargetAlert['stage'], null>, { title: string; priority: 'MEDIUM' | 'HIGH' }> = {
  J30: { title: 'Anticiper un point avec le porteur de projet (durée cible < 30j)', priority: 'MEDIUM' },
  DEPASSEE: { title: 'Faire un point avec le porteur de projet (durée cible dépassée)', priority: 'HIGH' },
};

/**
 * Alerte sur la durée cible du financement (Deal.startDate + durationMonths),
 * distincte de l'échéance de vote (dateMax, DeadlineAlertsService) — un
 * financement peut tenir son calendrier de vote tout en ayant dépassé la
 * durée pour laquelle il a été structuré, ce qui mérite son propre signal
 * pour déclencher un point avec le porteur de projet.
 */
@Injectable()
export class DurationTargetAlertsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DurationTargetAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly tasks: TasksService,
  ) {}

  onApplicationBootstrap() {
    void this.checkAll();
    setInterval(() => void this.checkAll(), CHECK_INTERVAL_MS);
  }

  private async checkAll() {
    const deals = await this.prisma.deal.findMany({
      where: { status: 'ACTIVE', startDate: { not: null }, durationMonths: { not: null }, repaid: false, stage: { not: 'DEFAUT' } },
      select: {
        id: true,
        organizationId: true,
        name: true,
        reference: true,
        startDate: true,
        durationMonths: true,
        assignedToId: true,
        createdById: true,
      },
    });

    let created = 0;
    for (const deal of deals) {
      try {
        if (!deal.organizationId) {
          this.logger.warn(`Deal ${deal.id} sans organizationId — ignoré.`);
          continue;
        }

        const alert = computeDurationTargetAlert(deal.startDate, deal.durationMonths);
        if (alert.level === 'RAS' || !alert.stage) continue;

        const alertTitle = `Durée cible ${alert.stage} — ${deal.reference}`;
        const existingAlert = await this.prisma.alert.findFirst({
          where: { organizationId: deal.organizationId, dealId: deal.id, title: alertTitle },
        });
        if (!existingAlert) {
          await this.alerts.create(deal.organizationId, {
            title: alertTitle,
            message: `${deal.name} — ${alert.actionLabel}`,
            severity: alert.level === 'URGENT' ? 'CRITICAL' : 'WARNING',
            dealId: deal.id,
          });
          created += 1;
        }

        await this.upsertCheckInTask(deal, alert);
      } catch (err) {
        this.logger.error(
          `Échec du traitement de la durée cible pour le deal ${deal.id}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
    if (created > 0) this.logger.log(`${created} nouvelle(s) alerte(s) de durée cible créée(s).`);
  }

  private async upsertCheckInTask(
    deal: { id: string; organizationId: string; name: string; reference: string; assignedToId: string | null; createdById: string },
    alert: DurationTargetAlert,
  ) {
    if (!alert.stage) return;
    const stageConfig = STAGE_TASK[alert.stage];
    const taskTitle = `${TASK_TITLE_PREFIX} — ${stageConfig.title} (${deal.reference})`;

    const alreadyExists = await this.prisma.task.findFirst({
      where: { dealId: deal.id, title: taskTitle },
      select: { id: true },
    });
    if (alreadyExists) return;

    // Un stage plus avancé remplace toute tâche encore ouverte de l'autre stage.
    await this.prisma.task.updateMany({
      where: { dealId: deal.id, title: { startsWith: `${TASK_TITLE_PREFIX} —` }, done: false },
      data: { done: true, completedAt: new Date() },
    });

    const assigneeId = deal.assignedToId ?? deal.createdById;
    await this.tasks.create(deal.organizationId, assigneeId, {
      title: taskTitle,
      dealId: deal.id,
      priority: stageConfig.priority,
      dueDate: new Date().toISOString().slice(0, 10),
      assigneeId,
    });
  }
}
