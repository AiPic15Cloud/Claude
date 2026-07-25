import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateTaskDto) {
    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({ where: { id: dto.dealId, organizationId } });
      if (!deal) throw new NotFoundException('Opération introuvable');
    }

    const task = await this.prisma.task.create({
      data: {
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
      deal: { organizationId },
      ...(query.done !== undefined ? { done: query.done === 'true' } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.dueBefore ? { dueDate: { lte: new Date(query.dueBefore) } } : {}),
      ...(query.scope !== 'all' ? { assigneeId: userId } : {}),
    };

    // Tasks not attached to a deal still belong to the org via the assignee;
    // include them explicitly since the `deal` relation filter above would exclude them.
    const orgWhere: Prisma.TaskWhereInput = {
      OR: [
        where,
        {
          dealId: null,
          assigneeId: query.scope === 'all' ? undefined : userId,
          ...(query.done !== undefined ? { done: query.done === 'true' } : {}),
          ...(query.priority ? { priority: query.priority } : {}),
          ...(query.dueBefore ? { dueDate: { lte: new Date(query.dueBefore) } } : {}),
        },
      ],
    };

    return this.prisma.task.findMany({
      where: orgWhere,
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
      where: { dealId },
      include: { assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: [{ done: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id, deal: { organizationId } },
    });
    const orphanTask = task ?? (await this.prisma.task.findFirst({ where: { id, dealId: null } }));
    if (!orphanTask) throw new NotFoundException('Tâche introuvable');

    const wasIncomplete = !orphanTask.done;
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

  async remove(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { OR: [{ id, deal: { organizationId } }, { id, dealId: null }] },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');
    await this.prisma.task.delete({ where: { id } });
  }
}
