import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { TasksService } from '../tasks/tasks.service';
import { computeDeadlineAlert, type DeadlineAlert } from './deadline.util';

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;

// Every escalation task shares this prefix so the previous stage's task can
// be recognized and closed out the moment a new, more urgent one is due —
// there's only ever one live escalation task per deal, always reflecting
// the current stage, never a pile-up of stale J-90/J-60 reminders.
const TASK_TITLE_PREFIX = 'Suivi échéance';

const STAGE_TASK: Record<
  Exclude<DeadlineAlert['stage'], null>,
  { title: string; priority: 'MEDIUM' | 'HIGH' | 'URGENT'; escalateToAdmin: boolean }
> = {
  J90: { title: 'Demander des infos au porteur (anticiper un vote)', priority: 'MEDIUM', escalateToAdmin: false },
  J60: { title: 'Dernière relance au porteur avant transfert interne', priority: 'HIGH', escalateToAdmin: false },
  J30: { title: 'Dossier à transférer — mail de pression (délai 1 semaine)', priority: 'URGENT', escalateToAdmin: true },
  J15: { title: 'Dernier délai — drafter la newsletter de vote', priority: 'URGENT', escalateToAdmin: true },
  CONTENTIEUX: { title: 'Échéance dépassée — passage en contentieux', priority: 'URGENT', escalateToAdmin: true },
};

/**
 * Surfaces the same J-90/J-60/J-30/J-15/contentieux échéance thresholds
 * already computed for Cockpit as real notifications in the alerts bell,
 * AND as an actionable Task — the process described by the team is a
 * to-do at each stage (send a specific email, escalate to management),
 * not just something to notice in a bell. J-30 onward reassigns the task
 * to an org admin, mirroring "vous me passez le bébé" — the analyst
 * doesn't have to remember to escalate, the tool does it.
 */
@Injectable()
export class DeadlineAlertsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DeadlineAlertsService.name);

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
      where: { status: 'ACTIVE', dateMax: { not: null }, repaid: false },
      select: {
        id: true,
        organizationId: true,
        name: true,
        reference: true,
        dateMax: true,
        assignedToId: true,
        createdById: true,
      },
    });

    let created = 0;
    for (const deal of deals) {
      const alert = computeDeadlineAlert(deal.dateMax);
      if (alert.level === 'RAS' || !alert.stage) continue;

      const alertTitle = `Échéance ${alert.stage} — ${deal.reference}`;
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

      await this.upsertEscalationTask(deal, alert);
    }
    if (created > 0) this.logger.log(`${created} nouvelle(s) alerte(s) d'échéance créée(s).`);
  }

  private async upsertEscalationTask(
    deal: { id: string; organizationId: string; name: string; reference: string; assignedToId: string | null; createdById: string },
    alert: DeadlineAlert,
  ) {
    if (!alert.stage) return;
    const stageConfig = STAGE_TASK[alert.stage];
    const taskTitle = `${TASK_TITLE_PREFIX} — ${stageConfig.title} (${deal.reference})`;

    const alreadyCurrent = await this.prisma.task.findFirst({
      where: { dealId: deal.id, title: taskTitle, done: false },
      select: { id: true },
    });
    if (alreadyCurrent) return; // this exact stage's task already exists — nothing to do

    // A later stage supersedes any earlier still-open escalation task for
    // this deal — closing it avoids a pile-up of stale reminders.
    await this.prisma.task.updateMany({
      where: { dealId: deal.id, title: { startsWith: `${TASK_TITLE_PREFIX} —` }, done: false },
      data: { done: true, completedAt: new Date() },
    });

    let assigneeId = deal.assignedToId ?? deal.createdById;
    if (stageConfig.escalateToAdmin) {
      const admin = await this.prisma.user.findFirst({
        where: { organizationId: deal.organizationId, role: 'ADMIN' },
        select: { id: true },
      });
      if (admin) assigneeId = admin.id;
    }

    await this.tasks.create(deal.organizationId, assigneeId, {
      title: taskTitle,
      dealId: deal.id,
      priority: stageConfig.priority,
      dueDate: new Date().toISOString().slice(0, 10),
      assigneeId,
    });
  }
}
