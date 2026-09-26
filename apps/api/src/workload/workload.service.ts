import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface WorkloadEntry {
  assigneeId: string;
  assigneeName: string;
  openCount: number;
  overdueCount: number;
  /** Somme des heures estimées — uniquement sur les tâches qui en portent
   * une. Ne compte jamais une tâche sans estimation comme "0h" (doctrine
   * "Unknown ≠ Zero") : voir unestimatedCount pour la visibilité sur les
   * tâches non chiffrées, qui contribuent à la charge réelle sans être
   * mesurables ici. */
  estimatedHoursTotal: number;
  unestimatedCount: number;
  byPriority: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', number>;
}

@Injectable()
export class WorkloadService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string): Promise<WorkloadEntry[]> {
    const tasks = await this.prisma.task.findMany({
      where: { organizationId, done: false, cancelledAt: null },
      select: {
        assigneeId: true,
        assignee: { select: { firstName: true, lastName: true } },
        dueDate: true,
        priority: true,
        estimatedHours: true,
      },
    });

    const now = new Date();
    const byAssignee = new Map<string, WorkloadEntry>();

    for (const task of tasks) {
      let entry = byAssignee.get(task.assigneeId);
      if (!entry) {
        entry = {
          assigneeId: task.assigneeId,
          assigneeName: `${task.assignee.firstName} ${task.assignee.lastName}`.trim(),
          openCount: 0,
          overdueCount: 0,
          estimatedHoursTotal: 0,
          unestimatedCount: 0,
          byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
        };
        byAssignee.set(task.assigneeId, entry);
      }

      entry.openCount += 1;
      if (task.dueDate && task.dueDate < now) entry.overdueCount += 1;
      if (task.estimatedHours !== null) entry.estimatedHoursTotal += Number(task.estimatedHours);
      else entry.unestimatedCount += 1;
      entry.byPriority[task.priority] += 1;
    }

    return Array.from(byAssignee.values()).sort((a, b) => b.openCount - a.openCount);
  }
}
