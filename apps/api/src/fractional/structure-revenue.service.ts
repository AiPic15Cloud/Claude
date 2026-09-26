import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { computeStructureRevenueForecast, type StructureFeeInput } from './structure-revenue-forecast.util';
import { UpsertStructureTargetDto } from './dto/upsert-structure-target.dto';

/**
 * Prévision des flux de la structure (spec Cockpit/Fractionné P2 §5.5) —
 * agrège les frais des stakeholders SPONSOR (Nicolas et son associé) à
 * travers tous les dossiers Fractionné de l'organisation, jamais un seul
 * dossier isolé : "la structure" est transverse au portefeuille.
 */
@Injectable()
export class StructureRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getForecast(organizationId: string, year: number) {
    const fees = await this.prisma.fractionalFeeDefinition.findMany({
      where: { stakeholder: { role: 'SPONSOR', project: { organizationId } } },
      include: { stakeholder: { select: { name: true } }, project: { select: { name: true } } },
    });

    const input: StructureFeeInput[] = fees.map((f) => ({
      id: f.id,
      projectId: f.projectId,
      projectName: f.project.name,
      stakeholderId: f.stakeholderId,
      stakeholderName: f.stakeholder.name,
      feeType: f.feeType,
      ratePct: f.ratePct !== null ? Number(f.ratePct) : null,
      fixedAmount: f.fixedAmount !== null ? Number(f.fixedAmount) : null,
      startYear: f.startYear,
      endYear: f.endYear,
      negotiationStatus: f.negotiationStatus,
    }));

    const forecast = computeStructureRevenueForecast(input, year);
    const target = await this.getTarget(organizationId, year);
    return { ...forecast, target };
  }

  async getTarget(organizationId: string, year: number) {
    return this.prisma.fractionalStructureTarget.findUnique({ where: { organizationId_year: { organizationId, year } } });
  }

  async upsertTarget(organizationId: string, year: number, dto: UpsertStructureTargetDto, user: AuthenticatedUser) {
    return this.prisma.fractionalStructureTarget.upsert({
      where: { organizationId_year: { organizationId, year } },
      create: { organizationId, year, ...dto, createdById: user.id },
      update: dto,
    });
  }
}
