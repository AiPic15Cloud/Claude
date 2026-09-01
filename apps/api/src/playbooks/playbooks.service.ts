import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { AlertsService } from '../alerts/alerts.service';
import { ContagionService } from '../entity-graph/contagion.service';
import { PROCEDURE_COLLECTIVE_ACTIONS } from './procedure-collective.playbook';

const DAY_MS = 86_400_000;

const PLAYBOOK_INCLUDE = {
  actions: {
    include: { task: { select: { id: true, title: true, done: true, dueDate: true, assigneeId: true } } },
  },
} as const;

/**
 * Fondation A.4/A.7 (spec ATLAS v2) — un seul playbook ("procédure
 * collective ouverte"), déclenché automatiquement, dont chaque action est
 * une Task réelle (voir schema.prisma, PlaybookActionItem). Ne construit PAS
 * la bibliothèque étendue par type d'événement (retard, mise en demeure...) —
 * explicitement NEXT.
 */
@Injectable()
export class PlaybooksService {
  private readonly logger = new Logger(PlaybooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly alerts: AlertsService,
    private readonly contagion: ContagionService,
  ) {}

  async listForDeal(organizationId: string, dealId: string) {
    return this.prisma.playbookInstance.findMany({
      where: { organizationId, dealId },
      include: PLAYBOOK_INCLUDE,
      orderBy: { triggeredAt: 'desc' },
    });
  }

  /**
   * Idempotent via la contrainte unique (dealId, eventType) : si une instance
   * existe déjà pour ce dossier, no-op silencieux — peu importe lequel des
   * deux signaux (recoveryStatus manuel ou détection BODACC) arrive en
   * premier, le playbook ne se déclenche jamais deux fois.
   */
  async triggerProcedureCollective(organizationId: string, dealId: string, triggerSource: string): Promise<void> {
    const existing = await this.prisma.playbookInstance.findUnique({
      where: { dealId_eventType: { dealId, eventType: 'PROCEDURE_COLLECTIVE_OUVERTE' } },
      select: { id: true },
    });
    if (existing) return;

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true, reference: true, assignedToId: true, createdById: true },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');

    const anchorDate = new Date();
    const assigneeId = deal.assignedToId ?? deal.createdById;

    const instance = await this.prisma.playbookInstance.create({
      data: { organizationId, dealId, eventType: 'PROCEDURE_COLLECTIVE_OUVERTE', triggerSource, anchorDate },
    });

    for (const action of PROCEDURE_COLLECTIVE_ACTIONS) {
      const dueDate = new Date(anchorDate.getTime() + action.deadlineOffsetDays * DAY_MS);
      const task = await this.tasks.create(organizationId, assigneeId, {
        title: `[Procédure collective] ${action.label} — ${deal.reference}`,
        dealId,
        priority: action.bloquant ? 'URGENT' : 'HIGH',
        dueDate: dueDate.toISOString().slice(0, 10),
        assigneeId,
      });
      await this.prisma.playbookActionItem.create({
        data: { playbookInstanceId: instance.id, key: action.key, bloquant: action.bloquant, taskId: task.id },
      });
    }

    this.logger.log(`Playbook "procédure collective ouverte" déclenché pour le dossier ${deal.reference} (source: ${triggerSource}).`);

    // Contagion niveau 1 (spec ATLAS v2, B.4) — uniquement au premier
    // déclenchement réel (on est passé le early-return d'idempotence
    // ci-dessus), jamais réévalué sur un no-op.
    await this.contagion.checkContagion(organizationId, dealId, 'Procédure collective ouverte');
  }

  /**
   * Ne décale jamais l'échéance d'une action déjà cochée — seule la
   * projection future change quand la date réelle de publication BODACC est
   * connue après coup.
   */
  async updateAnchorDate(organizationId: string, dealId: string, instanceId: string, newAnchorDate: Date) {
    const instance = await this.prisma.playbookInstance.findFirst({
      where: { id: instanceId, organizationId, dealId },
      include: { actions: { include: { task: true } } },
    });
    if (!instance) throw new NotFoundException('Instance de playbook introuvable');

    await this.prisma.playbookInstance.update({ where: { id: instance.id }, data: { anchorDate: newAnchorDate } });

    const definitions = new Map(PROCEDURE_COLLECTIVE_ACTIONS.map((a) => [a.key, a]));
    for (const item of instance.actions) {
      if (item.task.done) continue;
      const def = definitions.get(item.key);
      if (!def) continue;
      const dueDate = new Date(newAnchorDate.getTime() + def.deadlineOffsetDays * DAY_MS);
      await this.prisma.task.update({ where: { id: item.taskId }, data: { dueDate } });
    }

    return this.prisma.playbookInstance.findUniqueOrThrow({ where: { id: instance.id }, include: PLAYBOOK_INCLUDE });
  }

  /**
   * Remontée portefeuille basique (A.7) : une action bloquante en retard crée
   * une Alert, déjà agrégée au niveau Cockpit — pas de nouvelle UI
   * portefeuille. Garde anti-doublon par titre, même pattern que
   * RiskEngineService.maybeAlert().
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async escalateOverdueBlockingActions() {
    const now = new Date();
    const overdue = await this.prisma.playbookActionItem.findMany({
      where: { bloquant: true, task: { done: false, dueDate: { lt: now } } },
      include: {
        task: { select: { id: true, title: true, dueDate: true, dealId: true } },
        playbookInstance: { select: { organizationId: true, dealId: true, deal: { select: { reference: true, name: true } } } },
      },
    });

    let created = 0;
    for (const item of overdue) {
      const title = `Action bloquante en retard — ${item.playbookInstance.deal.reference}`;
      const existingAlert = await this.prisma.alert.findFirst({
        where: { organizationId: item.playbookInstance.organizationId, dealId: item.playbookInstance.dealId, title },
      });
      if (existingAlert) continue;

      await this.alerts.create(item.playbookInstance.organizationId, {
        title,
        message: `${item.playbookInstance.deal.name} : "${item.task.title}" est bloquante et en retard depuis le ${item.task.dueDate!.toLocaleDateString('fr-FR')}.`,
        severity: 'CRITICAL',
        dealId: item.playbookInstance.dealId,
      });
      created += 1;
    }
    if (created > 0) this.logger.log(`${created} alerte(s) d'action bloquante en retard créée(s).`);
  }
}
