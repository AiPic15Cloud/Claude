import { Injectable, NotFoundException } from '@nestjs/common';
import { MilestoneStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { computeProjectProgress } from './progress.util';

const RESOLVED_STATUSES: MilestoneStatus[] = ['DONE', 'WAIVED'];

@Injectable()
export class ProjectMilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');
  }

  async list(organizationId: string, dealId: string) {
    await this.assertDeal(organizationId, dealId);
    return this.prisma.portfolioMilestone.findMany({
      where: { dealId, organizationId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { tasks: { select: { id: true, title: true, done: true } } },
    });
  }

  /** Avancement composite du dossier (jalons + tâches), voir progress.util.ts. */
  async getProgress(organizationId: string, dealId: string) {
    await this.assertDeal(organizationId, dealId);
    const [milestones, tasks] = await Promise.all([
      this.prisma.portfolioMilestone.findMany({ where: { dealId, organizationId }, select: { status: true, blocking: true } }),
      this.prisma.task.findMany({ where: { dealId, organizationId, cancelledAt: null }, select: { done: true } }),
    ]);
    return computeProjectProgress(milestones, tasks);
  }

  async create(organizationId: string, dealId: string, userId: string, dto: CreateMilestoneDto) {
    await this.assertDeal(organizationId, dealId);
    const milestone = await this.prisma.portfolioMilestone.create({
      data: {
        dealId,
        organizationId,
        createdById: userId,
        label: dto.label,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        blocking: dto.blocking ?? false,
        order: dto.order ?? 0,
      },
    });
    await this.activities.log(dealId, userId, 'MILESTONE_ADDED', `Jalon ajouté : ${milestone.label}`);
    return milestone;
  }

  async update(organizationId: string, dealId: string, id: string, userId: string, dto: UpdateMilestoneDto) {
    await this.assertDeal(organizationId, dealId);
    const existing = await this.prisma.portfolioMilestone.findFirst({ where: { id, dealId, organizationId } });
    if (!existing) throw new NotFoundException('Jalon introuvable');

    const statusChanged = dto.status !== undefined && dto.status !== existing.status;
    const nowResolved = dto.status !== undefined && RESOLVED_STATUSES.includes(dto.status);
    const wasResolved = RESOLVED_STATUSES.includes(existing.status);

    const updated = await this.prisma.portfolioMilestone.update({
      where: { id },
      data: {
        label: dto.label,
        description: dto.description,
        targetDate: dto.targetDate !== undefined ? (dto.targetDate ? new Date(dto.targetDate) : null) : undefined,
        blocking: dto.blocking,
        order: dto.order,
        status: dto.status,
        // resolvedAt suit la transition résolu/non-résolu — jamais mis à
        // jour hors changement de statut réel, pour ne pas réécrire une date
        // de résolution déjà posée à chaque simple renommage du jalon.
        resolvedAt: statusChanged ? (nowResolved ? new Date() : wasResolved ? null : undefined) : undefined,
      },
    });

    if (statusChanged) {
      await this.activities.log(
        dealId,
        userId,
        'MILESTONE_STATUS_CHANGED',
        `Jalon "${updated.label}" — statut : ${dto.status}`,
      );
    }

    return updated;
  }

  async remove(organizationId: string, dealId: string, id: string) {
    await this.assertDeal(organizationId, dealId);
    const existing = await this.prisma.portfolioMilestone.findFirst({ where: { id, dealId, organizationId } });
    if (!existing) throw new NotFoundException('Jalon introuvable');
    await this.prisma.portfolioMilestone.delete({ where: { id } });
  }

  async reorder(organizationId: string, dealId: string, orderedIds: string[]) {
    await this.assertDeal(organizationId, dealId);
    const existing = await this.prisma.portfolioMilestone.findMany({ where: { dealId, organizationId }, select: { id: true } });
    const existingIds = new Set(existing.map((m) => m.id));
    const validIds = orderedIds.filter((id) => existingIds.has(id));

    await this.prisma.$transaction(
      validIds.map((id, index) => this.prisma.portfolioMilestone.update({ where: { id }, data: { order: index } })),
    );
  }
}
