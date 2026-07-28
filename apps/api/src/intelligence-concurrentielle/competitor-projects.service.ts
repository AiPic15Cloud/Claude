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
    return this.prisma.competitorProject.create({
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
  }

  async update(organizationId: string, id: string, dto: UpdateCompetitorProjectDto) {
    const project = await this.prisma.competitorProject.findFirst({ where: { id, organizationId } });
    if (!project) throw new NotFoundException('Projet concurrent introuvable');
    return this.prisma.competitorProject.update({
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
  }

  async remove(organizationId: string, id: string) {
    const project = await this.prisma.competitorProject.findFirst({ where: { id, organizationId } });
    if (!project) throw new NotFoundException('Projet concurrent introuvable');
    await this.prisma.competitorProject.delete({ where: { id } });
  }
}
