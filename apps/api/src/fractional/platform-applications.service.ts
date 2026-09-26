import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreatePlatformApplicationDto } from './dto/create-platform-application.dto';
import { UpdatePlatformApplicationDto } from './dto/update-platform-application.dto';
import { computePlatformComparison } from './platform-comparison.util';

/**
 * Candidatures d'un dossier à plusieurs plateformes (spec Cockpit/Fractionné
 * P1 §5.3) — un dossier peut être présenté à plusieurs plateformes
 * indépendamment, chacune avec son propre statut/échanges/offres. Distinct
 * de FractionalVehicleStructure.platformProfileId, qui reste la plateforme
 * opérationnelle utilisée pour les calculs d'éligibilité (P0) : voir
 * `syncOperativePlatform`.
 */
@Injectable()
export class PlatformApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectAccess(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({ where: { id: projectId, organizationId: user.organizationId } });
    if (!project) throw new NotFoundException('Dossier Fractionné introuvable.');
  }

  async list(projectId: string, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);
    return this.prisma.fractionalPlatformApplication.findMany({
      where: { projectId },
      include: { platformProfile: { select: { id: true, platformName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Comparatif formalisé (spec P2 §5.3) — matrice critère × candidature. */
  async compare(projectId: string, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);
    const applications = await this.prisma.fractionalPlatformApplication.findMany({
      where: { projectId },
      include: {
        platformProfile: {
          select: {
            id: true,
            platformName: true,
            minNetInvestorYieldPct: true,
            targetHoldPeriodMonths: true,
            acquisitionFeePct: true,
            annualManagementFeePct: true,
            incomeShareInvestorPct: true,
            capitalGainShareInvestorPct: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return computePlatformComparison(
      applications.map((a) => ({
        id: a.id,
        status: a.status,
        offerSummary: a.offerSummary,
        rejectionReason: a.rejectionReason,
        comparedCriteria: a.comparedCriteria as Record<string, unknown> | null,
        platformProfile: {
          id: a.platformProfile.id,
          platformName: a.platformProfile.platformName,
          minNetInvestorYieldPct: Number(a.platformProfile.minNetInvestorYieldPct),
          targetHoldPeriodMonths: a.platformProfile.targetHoldPeriodMonths,
          acquisitionFeePct: Number(a.platformProfile.acquisitionFeePct),
          annualManagementFeePct: Number(a.platformProfile.annualManagementFeePct),
          incomeShareInvestorPct: Number(a.platformProfile.incomeShareInvestorPct),
          capitalGainShareInvestorPct: Number(a.platformProfile.capitalGainShareInvestorPct),
        },
      })),
    );
  }

  async create(projectId: string, dto: CreatePlatformApplicationDto, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);
    return this.prisma.fractionalPlatformApplication.create({
      data: {
        projectId,
        platformProfileId: dto.platformProfileId,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        firstContactDate: dto.firstContactDate ? new Date(dto.firstContactDate) : undefined,
        createdById: user.id,
      },
      include: { platformProfile: { select: { id: true, platformName: true } } },
    });
  }

  async update(projectId: string, applicationId: string, dto: UpdatePlatformApplicationDto, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);
    const existing = await this.prisma.fractionalPlatformApplication.findFirst({ where: { id: applicationId, projectId } });
    if (!existing) throw new NotFoundException('Candidature introuvable.');

    const updated = await this.prisma.fractionalPlatformApplication.update({
      where: { id: applicationId },
      data: {
        ...dto,
        comparedCriteria: dto.comparedCriteria as Prisma.InputJsonValue | undefined,
        firstContactDate: dto.firstContactDate ? new Date(dto.firstContactDate) : undefined,
        lastResponseDate: dto.lastResponseDate ? new Date(dto.lastResponseDate) : undefined,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
      },
      include: { platformProfile: { select: { id: true, platformName: true } } },
    });

    if (dto.status === 'ACCEPTEE') {
      await this.syncOperativePlatform(projectId, updated.platformProfileId);
    }
    return updated;
  }

  /**
   * Quand une candidature est acceptée, propose automatiquement la
   * plateforme comme profil opérationnel pour les calculs d'éligibilité —
   * seulement si aucun profil n'est déjà rattaché (jamais d'écrasement
   * silencieux d'un choix déjà fait).
   */
  private async syncOperativePlatform(projectId: string, platformProfileId: string) {
    const vehicleStructure = await this.prisma.fractionalVehicleStructure.findUnique({ where: { projectId } });
    if (!vehicleStructure || vehicleStructure.platformProfileId) return;
    await this.prisma.fractionalVehicleStructure.update({ where: { projectId }, data: { platformProfileId } });
  }
}
