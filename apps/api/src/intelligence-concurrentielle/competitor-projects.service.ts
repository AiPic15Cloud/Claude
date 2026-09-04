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

  /** Fenêtre de protection contre un double envoi du formulaire (double-clic passé outre le bouton désactivé, ou renvoi réseau) — pas une déduplication métier permanente : deux projets homonymes créés à des moments différents restent tous les deux légitimes. */
  private static readonly DUPLICATE_SUBMIT_WINDOW_MS = 10_000;

  // Même principe que PlatformsSyncService/RiskHistoryService : un verrou en
  // mémoire par fiche ferme la fenêtre de course qui subsisterait entre la
  // lecture du "doublon récent" ci-dessous et l'insertion elle-même si deux
  // requêtes arrivaient vraiment simultanément (second onglet, par ex.).
  private readonly entityLocks = new Map<string, Promise<unknown>>();

  private withEntityLock<T>(entityId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.entityLocks.get(entityId) ?? Promise.resolve();
    const run = previous.then(fn, fn);
    this.entityLocks.set(
      entityId,
      run.then(
        () => undefined,
        () => undefined,
      ),
    );
    return run;
  }

  async create(organizationId: string, entityId: string, userId: string, dto: CreateCompetitorProjectDto) {
    await this.assertEntity(organizationId, entityId);
    return this.withEntityLock(entityId, () => this.createLocked(organizationId, entityId, userId, dto));
  }

  private async createLocked(organizationId: string, entityId: string, userId: string, dto: CreateCompetitorProjectDto) {
    // CompetitorProject n'a pas de contrainte unique — saisie manuelle, sans
    // flux automatisé (cf. schema.prisma). Le seul risque de doublon vient
    // d'un double envoi du même formulaire ; le bouton est déjà désactivé
    // pendant l'envoi côté client (competitor-projects-panel.tsx), mais ça
    // ne couvre pas un renvoi réseau ou un second onglet. Un projet du même
    // nom déjà créé sur cette fiche dans les toutes dernières secondes est
    // renvoyé tel quel plutôt que dupliqué.
    const recentDuplicate = await this.prisma.competitorProject.findFirst({
      where: {
        entityId,
        name: { equals: dto.name, mode: 'insensitive' },
        createdAt: { gte: new Date(Date.now() - CompetitorProjectsService.DUPLICATE_SUBMIT_WINDOW_MS) },
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (recentDuplicate) return recentDuplicate;

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
