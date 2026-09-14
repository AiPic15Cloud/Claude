import { Injectable, NotFoundException } from '@nestjs/common';
import type { FractionalTechnicalSubBlock } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpsertTechnicalAssessmentDto } from './dto/upsert-technical-assessment.dto';
import { computeTechnicalRiskRating, computeCapexPlanByHorizon, TECHNICAL_SUB_BLOCKS } from './technical-dd.util';

/**
 * Asset & Technical Due Diligence Engine (spec V3.1 §6) — service applicatif
 * au-dessus de technical-dd.util.ts, mirroté sur DataRoomService (contrôle
 * d'accès organisation, upsert par sous-bloc).
 */
@Injectable()
export class TechnicalDdService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectAccess(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({ where: { id: projectId, organizationId: user.organizationId } });
    if (!project) throw new NotFoundException('Dossier non trouvé');
    return project;
  }

  async getAssessment(projectId: string, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);

    const [assessments, capexItems] = await Promise.all([
      this.prisma.fractionalTechnicalAssessment.findMany({ where: { projectId } }),
      this.prisma.fractionalCapexItem.findMany({ where: { projectId }, select: { annee: true, montant: true, responsable: true } }),
    ]);

    const rating = computeTechnicalRiskRating(assessments);
    const capexPlan = computeCapexPlanByHorizon(
      capexItems.map((i) => ({ annee: i.annee, montant: Number(i.montant), responsable: i.responsable })),
      new Date().getFullYear(),
    );

    return { rating, capexPlan };
  }

  async upsertAssessment(projectId: string, subBlockParam: string, dto: UpsertTechnicalAssessmentDto, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);

    if (!(subBlockParam in TECHNICAL_SUB_BLOCKS)) throw new NotFoundException(`Sous-bloc technique inconnu : ${subBlockParam}`);
    const subBlock = subBlockParam as FractionalTechnicalSubBlock;

    return this.prisma.fractionalTechnicalAssessment.upsert({
      where: { projectId_subBlock: { projectId, subBlock } },
      create: { projectId, subBlock, tier: dto.tier, conditionPrealable: dto.conditionPrealable ?? false, notes: dto.notes ?? null, updatedById: user.id },
      update: { tier: dto.tier, conditionPrealable: dto.conditionPrealable ?? false, notes: dto.notes ?? null, updatedById: user.id },
    });
  }
}
