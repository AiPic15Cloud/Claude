import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpsertEsgAssessmentDto } from './dto/upsert-esg-assessment.dto';
import { computeEsgRiskProfile } from './esg-risk.util';

/**
 * ESG, Energy & Obsolescence Risk Engine (spec V3.1 §12) — service
 * applicatif au-dessus de esg-risk.util.ts, mirroté sur DataRoomService
 * (contrôle d'accès organisation, upsert d'un enregistrement unique par
 * dossier).
 */
@Injectable()
export class EsgRiskService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectAccess(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({ where: { id: projectId, organizationId: user.organizationId } });
    if (!project) throw new NotFoundException('Dossier non trouvé');
    return project;
  }

  private async resolveSurfaceM2(projectId: string): Promise<number | null> {
    const leases = await this.prisma.fractionalLease.findMany({ where: { projectId }, select: { surfaceM2: true } });
    const known = leases.filter((l) => l.surfaceM2 !== null).map((l) => Number(l.surfaceM2));
    if (known.length === 0) return null;
    return known.reduce((sum, s) => sum + s, 0);
  }

  async getProfile(projectId: string, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);

    const [assessment, surfaceM2] = await Promise.all([
      this.prisma.fractionalEsgAssessment.findUnique({ where: { projectId } }),
      this.resolveSurfaceM2(projectId),
    ]);

    const profile = computeEsgRiskProfile(
      {
        dpeClass: assessment?.dpeClass ?? null,
        consumptionKwhM2An: assessment?.consumptionKwhM2An !== undefined && assessment?.consumptionKwhM2An !== null ? Number(assessment.consumptionKwhM2An) : null,
        decreeTertiaireSubject: assessment?.decreeTertiaireSubject ?? false,
        equipmentConditionTier: assessment?.equipmentConditionTier ?? null,
        physicalRiskExposure: assessment?.physicalRiskExposure ?? null,
        greenLeaseClauses: assessment?.greenLeaseClauses ?? false,
      },
      surfaceM2,
    );

    return { assessment, surfaceM2, profile };
  }

  async upsertAssessment(projectId: string, dto: UpsertEsgAssessmentDto, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);

    return this.prisma.fractionalEsgAssessment.upsert({
      where: { projectId },
      create: {
        projectId,
        dpeClass: dto.dpeClass ?? null,
        consumptionKwhM2An: dto.consumptionKwhM2An ?? null,
        decreeTertiaireSubject: dto.decreeTertiaireSubject ?? false,
        equipmentConditionTier: dto.equipmentConditionTier ?? null,
        physicalRiskExposure: dto.physicalRiskExposure ?? null,
        greenLeaseClauses: dto.greenLeaseClauses ?? false,
        notes: dto.notes ?? null,
        updatedById: user.id,
      },
      update: {
        dpeClass: dto.dpeClass ?? null,
        consumptionKwhM2An: dto.consumptionKwhM2An ?? null,
        decreeTertiaireSubject: dto.decreeTertiaireSubject ?? false,
        equipmentConditionTier: dto.equipmentConditionTier ?? null,
        physicalRiskExposure: dto.physicalRiskExposure ?? null,
        greenLeaseClauses: dto.greenLeaseClauses ?? false,
        notes: dto.notes ?? null,
        updatedById: user.id,
      },
    });
  }
}
