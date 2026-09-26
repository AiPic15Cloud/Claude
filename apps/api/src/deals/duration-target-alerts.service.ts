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
      where: { status: 'ACTIVE', startDate: { not: null }, durationMonths: { not: null }, repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] } },
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

    // Pré-calcule l'alerte de chaque deal en mémoire pour ne retenir que
    // ceux réellement concernés avant de batcher les lectures d'existence —
    // évite un findFirst par deal (N+1) sur les alertes ET les tâches.
    const eligible = deals
      .filter((deal) => {
        if (!deal.organizationId) {
          this.logger.warn(`Deal ${deal.id} sans organizationId — ignoré.`);
          return false;
        }
        return true;
      })
      .map((deal) => ({ deal, alert: computeDurationTargetAlert(deal.startDate, deal.durationMonths) }))
      .filter(({ alert }) => alert.level !== 'RAS' && alert.stage);

    const dealIds = eligible.map(({ deal }) => deal.id);
    const [existingAlerts, existingTasks] = await Promise.all([
      this.prisma.alert.findMany({ where: { dealId: { in: dealIds } }, select: { dealId: true, title: true } }),
      this.prisma.task.findMany({ where: { dealId: { in: dealIds }, title: { startsWith: TASK_TITLE_PREFIX } }, select: { dealId: true, title: true } }),
    ]);
    const existingAlertKeys = new Set(existingAlerts.map((a) => `${a.dealId}::${a.title}`));
    const existingTaskKeys = new Set(existingTasks.map((t) => `${t.dealId}::${t.title}`));

    let created = 0;
    for (const { deal, alert } of eligible) {
      try {
        const alertTitle = `Durée cible ${alert.stage} — ${deal.reference}`;
        if (!existingAlertKeys.has(`${deal.id}::${alertTitle}`)) {
          await this.alerts.create(deal.organizationId, {
            title: alertTitle,
            message: `${deal.name} — ${alert.actionLabel}`,
            severity: alert.level === 'URGENT' ? 'CRITICAL' : 'WARNING',
            dealId: deal.id,
          });
          created += 1;
        }

        await this.upsertCheckInTask(deal, alert, existingTaskKeys);
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
    existingTaskKeys: Set<string>,
  ) {
    if (!alert.stage) return;
    const stageConfig = STAGE_TASK[alert.stage];
    const taskTitle = `${TASK_TITLE_PREFIX} — ${stageConfig.title} (${deal.reference})`;

    if (existingTaskKeys.has(`${deal.id}::${taskTitle}`)) return;

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
      typeTache: 'SUIVI_CIBLE',
    });
  }
}
