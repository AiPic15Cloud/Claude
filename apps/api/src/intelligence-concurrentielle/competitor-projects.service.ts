import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCompetitorProjectDto } from './dto/create-competitor-project.dto';
import { UpdateCompetitorProjectDto } from './dto/update-competitor-project.dto';

@Injectable()
export class CompetitorProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertEntity(organizationId: string, entityId: string) {
    const entity = await this.prisma.graphEntity.findFirst({ where: { id: entityId, organizationId } });
    if (!entity) throw new NotFoundException('Entité introuvable');
  }

  async list(organizationId: string, entityId: string) {
    await this.assertEntity(organizationId, entityId);
    return this.prisma.competitorProject.findMany({
      where: { entityId, organizationId },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: [{ status: 'asc' }, { expectedDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(organizationId: string, entityId: string, userId: string, dto: CreateCompetitorProjectDto) {
    await this.assertEntity(organizationId, entityId);
    const project = await this.prisma.competitorProject.create({
      data: {
        organizationId,
        entityId,
        createdById: userId,
        name: dto.name,
        status: dto.status,
        targetAmount: dto.targetAmount,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        url: dto.url,
        note: dto.note,
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    await this.prisma.competitorProjectEvent.create({
      data: { entityId, projectId: project.id, projectName: project.name, eventType: 'PROJECT_DETECTED', newStatus: project.status },
    });
    return project;
  }

  async update(organizationId: string, id: string, dto: UpdateCompetitorProjectDto) {
    const project = await this.prisma.competitorProject.findFirst({ where: { id, organizationId } });
    if (!project) throw new NotFoundException('Projet concurrent introuvable');
    const updated = await this.prisma.competitorProject.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        targetAmount: dto.targetAmount,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        url: dto.url,
        note: dto.note,
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });

    if (dto.status !== undefined && dto.status !== project.status) {
      const eventType =
        project.status === 'A_VENIR' && dto.status === 'EN_COLLECTE'
          ? 'FUNDING_OPENED'
          : project.status === 'EN_COLLECTE' && dto.status === 'CLOTURE'
            ? 'FUNDING_CLOSED'
            : 'PROJECT_UPDATED';
      await this.prisma.competitorProjectEvent.create({
        data: {
          entityId: updated.entityId,
          projectId: updated.id,
          projectName: updated.name,
          eventType,
          previousStatus: project.status,
          newStatus: updated.status,
        },
      });
    } else if (updated.name !== project.name || Number(updated.targetAmount ?? 0) !== Number(project.targetAmount ?? 0) || updated.url !== project.url) {
      await this.prisma.competitorProjectEvent.create({
        data: { entityId: updated.entityId, projectId: updated.id, projectName: updated.name, eventType: 'PROJECT_UPDATED' },
      });
    }

    return updated;
  }

  async remove(organizationId: string, id: string) {
    const project = await this.prisma.competitorProject.findFirst({ where: { id, organizationId } });
    if (!project) throw new NotFoundException('Projet concurrent introuvable');
    await this.prisma.competitorProjectEvent.create({
      data: { entityId: project.entityId, projectId: project.id, projectName: project.name, eventType: 'PROJECT_REMOVED', previousStatus: project.status },
    });
    await this.prisma.competitorProject.delete({ where: { id } });
  }

  /** Historique d'un projet concurrent (spec ATLAS v2, C.3) — colonnes dénormalisées, survit à la suppression du projet. */
  async listEvents(organizationId: string, entityId: string) {
    await this.assertEntity(organizationId, entityId);
    return this.prisma.competitorProjectEvent.findMany({ where: { entityId }, orderBy: { occurredAt: 'desc' } });
  }
}
