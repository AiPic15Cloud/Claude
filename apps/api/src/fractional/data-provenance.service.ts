import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpsertDataProvenanceDto } from './dto/upsert-data-provenance.dto';
import { CRITICAL_FIELD_KEYS_BY_ENTITY_TYPE, computeDataConfidence, type CriticalFieldRef } from './data-confidence.util';

/**
 * Data Integrity Engine — provenance généralisée (V3.1 §3 + hiérarchie
 * Level A-E de V2 §3), attachable à n'importe quel champ de n'importe
 * quelle entité Fractionné. Le registre d'entityType supportés reste fermé
 * (PROJECT/LEASE) — jamais une chaîne libre non résolvable en dossier, pour
 * que le contrôle d'accès organisation reste garanti à chaque appel.
 */
export type ProvenanceEntityType = 'PROJECT' | 'LEASE';

@Injectable()
export class DataProvenanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveProjectId(entityType: string, entityId: string, user: AuthenticatedUser): Promise<string> {
    if (entityType === 'PROJECT') {
      const project = await this.prisma.fractionalProject.findFirst({ where: { id: entityId, organizationId: user.organizationId } });
      if (!project) throw new NotFoundException('Dossier non trouvé');
      return project.id;
    }
    if (entityType === 'LEASE') {
      const lease = await this.prisma.fractionalLease.findUnique({ where: { id: entityId }, include: { project: true } });
      if (!lease || lease.project.organizationId !== user.organizationId) throw new NotFoundException('Bail non trouvé');
      return lease.projectId;
    }
    throw new BadRequestException(`entityType inconnu : ${entityType} (attendu : PROJECT, LEASE)`);
  }

  async listForEntity(entityType: string, entityId: string, user: AuthenticatedUser) {
    await this.resolveProjectId(entityType, entityId, user);
    return this.prisma.fractionalDataProvenance.findMany({ where: { entityType, entityId }, orderBy: { fieldKey: 'asc' } });
  }

  async upsert(entityType: string, entityId: string, fieldKey: string, dto: UpsertDataProvenanceDto, user: AuthenticatedUser) {
    if (dto.isOverride && !dto.overrideJustification?.trim()) {
      throw new BadRequestException('Une justification est obligatoire pour un override (isOverride=true).');
    }
    const projectId = await this.resolveProjectId(entityType, entityId, user);

    const existing = await this.prisma.fractionalDataProvenance.findUnique({ where: { entityType_entityId_fieldKey: { entityType, entityId, fieldKey } } });

    return this.prisma.fractionalDataProvenance.upsert({
      where: { entityType_entityId_fieldKey: { entityType, entityId, fieldKey } },
      create: {
        projectId,
        entityType,
        entityId,
        fieldKey,
        sourceLevel: dto.sourceLevel,
        sourceReference: dto.sourceReference ?? null,
        asOfDate: dto.asOfDate ? new Date(dto.asOfDate) : null,
        verificationStatus: dto.verificationStatus,
        confidence: dto.confidence,
        ownerId: dto.ownerId ?? user.id,
        isOverride: dto.isOverride ?? false,
        overrideJustification: dto.overrideJustification ?? null,
      },
      update: {
        sourceLevel: dto.sourceLevel,
        sourceReference: dto.sourceReference ?? null,
        asOfDate: dto.asOfDate ? new Date(dto.asOfDate) : null,
        verificationStatus: dto.verificationStatus,
        confidence: dto.confidence,
        ownerId: dto.ownerId ?? user.id,
        isOverride: dto.isOverride ?? false,
        overrideJustification: dto.overrideJustification ?? null,
        version: (existing?.version ?? 0) + 1,
      },
    });
  }

  async getDataConfidenceForProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({
      where: { id: projectId, organizationId: user.organizationId },
      select: { id: true, leases: { select: { id: true } } },
    });
    if (!project) throw new NotFoundException('Dossier non trouvé');

    const criticalFields: CriticalFieldRef[] = [
      ...CRITICAL_FIELD_KEYS_BY_ENTITY_TYPE.PROJECT.map((f) => ({ entityType: 'PROJECT', entityId: project.id, fieldKey: f.fieldKey, label: f.label })),
      ...project.leases.flatMap((lease) =>
        CRITICAL_FIELD_KEYS_BY_ENTITY_TYPE.LEASE.map((f) => ({ entityType: 'LEASE', entityId: lease.id, fieldKey: f.fieldKey, label: f.label })),
      ),
    ];

    const provenanceRecords = await this.prisma.fractionalDataProvenance.findMany({ where: { projectId } });

    return computeDataConfidence(criticalFields, provenanceRecords);
  }
}
