import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { UpdateRelationshipDto } from './dto/update-relationship.dto';

const RELATIONSHIP_INCLUDE = {
  type: true,
  sourceEntity: { select: { id: true, name: true, type: true, domain: true } },
  targetEntity: { select: { id: true, name: true, type: true, domain: true } },
  evidence: { orderBy: { createdAt: 'desc' as const } },
  events: { orderBy: { occurredAt: 'desc' as const } },
} satisfies Prisma.RelationshipInclude;

/**
 * Fondation du Knowledge Graph v2 (spec ATLAS v2, B.2) — niveau 1 seulement :
 * une Relationship porte toujours au moins une Evidence (jamais de lien sans
 * preuve, même déclarative — section 0.2), et toute modification d'un champ
 * mutable (amount/percentage/status/confidence) journalise un
 * RelationshipEvent typé avant/après. Ne construit PAS les requêtes
 * déterministes de niveau 2 (groupe économique, garanties partagées — B.3) :
 * ce service ne fait que lire/écrire le modèle, sans dérivation.
 */
@Injectable()
export class RelationshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertEntity(organizationId: string, id: string) {
    const entity = await this.prisma.entity.findFirst({ where: { id, organizationId } });
    if (!entity) throw new NotFoundException('Entité introuvable');
    return entity;
  }

  private async assertRelationship(organizationId: string, id: string) {
    const relationship = await this.prisma.relationship.findFirst({ where: { id, organizationId } });
    if (!relationship) throw new NotFoundException('Relation introuvable');
    return relationship;
  }

  async listForEntity(organizationId: string, entityId: string) {
    await this.assertEntity(organizationId, entityId);
    return this.prisma.relationship.findMany({
      where: { organizationId, OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }] },
      include: RELATIONSHIP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, dto: CreateRelationshipDto) {
    await this.assertEntity(organizationId, dto.sourceEntityId);
    await this.assertEntity(organizationId, dto.targetEntityId);
    if (dto.sourceEntityId === dto.targetEntityId) {
      throw new ConflictException('Une entité ne peut pas être reliée à elle-même');
    }
    const type = await this.prisma.relationshipType.findUnique({ where: { key: dto.typeKey } });
    if (!type) throw new NotFoundException(`Type de relation inconnu : ${dto.typeKey}`);

    const id = nanoid();
    return this.prisma.$transaction(async (tx) => {
      await tx.relationship.create({
        data: {
          id,
          organizationId,
          sourceEntityId: dto.sourceEntityId,
          targetEntityId: dto.targetEntityId,
          typeKey: dto.typeKey,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
          amount: dto.amount,
          percentage: dto.percentage,
          criticality: dto.criticality ?? 0,
        },
      });
      await tx.evidence.create({
        data: {
          relationshipId: id,
          level: dto.evidenceLevel,
          source: dto.evidenceSource,
          reference: dto.evidenceReference,
          note: dto.evidenceNote,
          createdById: userId,
        },
      });
      await tx.relationshipEvent.create({ data: { relationshipId: id, eventType: 'CREATED' } });

      return tx.relationship.findUniqueOrThrow({ where: { id }, include: RELATIONSHIP_INCLUDE });
    });
  }

  async addEvidence(organizationId: string, userId: string, relationshipId: string, dto: AddEvidenceDto) {
    await this.assertRelationship(organizationId, relationshipId);
    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.evidence.create({
        data: {
          relationshipId,
          level: dto.level,
          source: dto.source,
          reference: dto.reference,
          note: dto.note,
          createdById: userId,
        },
      });
      await tx.relationshipEvent.create({ data: { relationshipId, eventType: 'EVIDENCE_ADDED', note: dto.source } });
      return evidence;
    });
  }

  async update(organizationId: string, relationshipId: string, dto: UpdateRelationshipDto) {
    const current = await this.assertRelationship(organizationId, relationshipId);

    return this.prisma.$transaction(async (tx) => {
      const events: Prisma.RelationshipEventCreateManyInput[] = [];
      const currentAmount = current.amount === null ? null : Number(current.amount);
      const currentPercentage = current.percentage === null ? null : Number(current.percentage);

      if (dto.amount !== undefined && currentAmount !== dto.amount) {
        events.push({ relationshipId, eventType: 'AMOUNT_CHANGED', previousAmount: current.amount, newAmount: dto.amount });
      }
      if (dto.percentage !== undefined && currentPercentage !== dto.percentage) {
        events.push({ relationshipId, eventType: 'PERCENTAGE_CHANGED', previousPercentage: current.percentage, newPercentage: dto.percentage });
      }
      if (dto.status !== undefined && current.status !== dto.status) {
        events.push({
          relationshipId,
          eventType: dto.status === 'ENDED' ? 'ENDED' : 'STATUS_CHANGED',
          previousStatus: current.status,
          newStatus: dto.status,
        });
      }
      if (dto.confidence !== undefined && current.confidence !== dto.confidence) {
        events.push({ relationshipId, eventType: 'CONFIDENCE_CHANGED', previousConfidence: current.confidence, newConfidence: dto.confidence });
      }

      await tx.relationship.update({
        where: { id: relationshipId },
        data: {
          amount: dto.amount,
          percentage: dto.percentage,
          criticality: dto.criticality,
          status: dto.status,
          confidence: dto.confidence,
          endedAt: dto.status === 'ENDED' ? new Date() : undefined,
          verifiedAt: dto.confidence === 'VERIFIED' ? new Date() : undefined,
        },
      });
      if (events.length > 0) await tx.relationshipEvent.createMany({ data: events });

      return tx.relationship.findUniqueOrThrow({ where: { id: relationshipId }, include: RELATIONSHIP_INCLUDE });
    });
  }
}
