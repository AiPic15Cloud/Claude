import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly alerts: AlertsService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateTaskDto) {
    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({ where: { id: dto.dealId, organizationId } });
      if (!deal) throw new NotFoundException('Opération introuvable');
    }

    const task = await this.prisma.task.create({
      data: {
        organizationId,
        title: dto.title,
        dealId: dto.dealId,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId ?? userId,
        createdById: userId,
      },
      include: { deal: { select: { id: true, name: true, reference: true } } },
    });

    if (dto.dealId) {
      await this.activities.log(dto.dealId, userId, 'TASK_CREATED', `Tâche créée : ${task.title}`);
    }
    return task;
  }

  async findAllForOrganization(organizationId: string, userId: string, query: QueryTasksDto) {
    const where: Prisma.TaskWhereInput = {
      organizationId,
      cancelledAt: null,
      ...(query.scope !== 'all' ? { assigneeId: userId } : {}),
      ...(query.done !== undefined ? { done: query.done === 'true' } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.dueBefore ? { dueDate: { lte: new Date(query.dueBefore) } } : {}),
    };

    return this.prisma.task.findMany({
      where,
      include: {
        deal: { select: { id: true, name: true, reference: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: [{ done: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async listForDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return this.prisma.task.findMany({
      where: { dealId, organizationId, cancelledAt: null },
      include: { assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: [{ done: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({ where: { id, organizationId, cancelledAt: null } });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const wasIncomplete = !task.done;
    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId,
        done: dto.done,
        completedAt: dto.done === true && wasIncomplete ? new Date() : dto.done === false ? null : undefined,
      },
      include: { deal: { select: { id: true, name: true, reference: true } } },
    });

    if (dto.done === true && wasIncomplete && updated.dealId) {
      await this.activities.log(updated.dealId, userId, 'TASK_COMPLETED', `Tâche complétée : ${updated.title}`);
    }
    return updated;
  }

  /**
   * Spec ATLAS v2, A.10 — audit trail : une action générée (par un
   * analyste ou par un playbook) ne doit jamais être effacée sans
   * laisser de trace. Annuler une tâche est une transition de statut,
   * jamais un DELETE — la ligne reste en base avec qui l'a annulée et
   * quand, elle disparaît seulement des listes actives (cf. filtres
   * `cancelledAt: null` ci-dessus).
   */
  async remove(organizationId: string, id: string, userId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, organizationId, cancelledAt: null } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    await this.prisma.task.update({ where: { id }, data: { cancelledAt: new Date(), cancelledById: userId } });
  }

  /**
   * Remontée portefeuille (spec ATLAS v2, A.7) pour les tâches ordinaires —
   * complète PlaybooksService.escalateOverdueBlockingActions(), qui ne
   * couvre que les tâches générées par un playbook. Pas de nouveau champ
   * "bloquant" sur Task : la priorité URGENT (déjà saisie par l'utilisateur
   * à la création) joue ce rôle — une tâche urgente en retard doit remonter,
   * une tâche normale non. Toute organisation, pas seulement l'assigné :
   * c'est une remontée "portefeuille", pas personnelle. Garde anti-doublon
   * par titre, même pattern que PlaybooksService.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async escalateOverdueUrgentTasks() {
    const now = new Date();
    const overdue = await this.prisma.task.findMany({
      where: { priority: 'URGENT', done: false, cancelledAt: null, dueDate: { lt: now } },
      select: { id: true, title: true, dueDate: true, dealId: true, organizationId: true },
    });

    let created = 0;
    for (const task of overdue) {
      const title = `Tâche urgente en retard — ${task.title}`;
      const existingAlert = await this.prisma.alert.findFirst({ where: { organizationId: task.organizationId, title } });
      if (existingAlert) continue;

      await this.alerts.create(task.organizationId, {
        title,
        message: `"${task.title}" est urgente et en retard depuis le ${task.dueDate!.toLocaleDateString('fr-FR')}.`,
        severity: 'CRITICAL',
        dealId: task.dealId ?? undefined,
      });
      created += 1;
    }
    if (created > 0) this.logger.log(`${created} alerte(s) de tâche urgente en retard créée(s).`);
  }
}
