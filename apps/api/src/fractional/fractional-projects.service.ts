import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { FractionalLeaseRenewalStatus, FractionalIndexationType, FractionalCapexResponsable, FractionalValuationMethod } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateFractionalProjectDto } from './dto/create-fractional-project.dto';
import { UpdateFractionalProjectDto } from './dto/update-fractional-project.dto';
import { UpsertSourcesUsesDto } from './dto/upsert-sources-uses.dto';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { CreateCapexItemDto } from './dto/create-capex-item.dto';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { UpsertVehicleStructureDto } from './dto/upsert-vehicle-structure.dto';
import { CreatePlatformProfileDto } from './dto/create-platform-profile.dto';
import { UpsertAssumptionSetDto } from './dto/upsert-assumption-set.dto';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { CreateFeeDefinitionDto } from './dto/create-fee-definition.dto';
import { CreateWaterfallTierDto } from './dto/create-waterfall-tier.dto';
import { computeReturnsEngine, type ReturnsEngineInput } from './returns.util';
import { computeEligibility } from './eligibility.util';
import { solveMaxAcquisitionPrice, solveMinSecuredRent } from './reverse-solver.util';
import { computeOperatingModelYear } from './operating-model.util';
import { computeStakeholderWaterfall, solveMaxTotalFeeLoad, solveMaxCarry, type YearContext, type StakeholderInput, type FeeDefinitionInput, type WaterfallTierInput } from './stakeholder-waterfall.util';
import type { LeaseInput } from './lease-security.util';

/**
 * Périmètre P0 — visibilité des FractionalProject scopée au créateur
 * (createdById), quel que soit son rôle (patch V3.2 §1, hypothèse posée par
 * défaut) : jamais remonté au Cockpit organisationnel. On renvoie
 * NotFoundException (pas Forbidden) sur un accès hors-scope pour ne pas
 * révéler l'existence d'un dossier d'un autre utilisateur.
 */
function assertOwned<T extends { createdById: string }>(entity: T | null, userId: string): T {
  if (!entity || entity.createdById !== userId) throw new NotFoundException('Dossier Fractionné introuvable.');
  return entity;
}

interface DefaultAssumptionValues {
  holdPeriodYears: number;
  vacancyCreditLossPct: number;
  opexPct: number;
  rentGrowthPctPerYear: number;
  sellingCostsPct: number;
  materialityThresholdPct: number;
  exitValueOverride?: number;
}

const DEFAULT_ASSUMPTIONS: DefaultAssumptionValues = {
  holdPeriodYears: 5,
  vacancyCreditLossPct: 3,
  opexPct: 15,
  rentGrowthPctPerYear: 1.5,
  sellingCostsPct: 6,
  materialityThresholdPct: 5,
};

// Haircut appliqué quand aucun AssumptionSet SEVERE/BEAR n'est encore saisi
// pour le dossier — permet d'afficher un Stressed Net Yield indicatif dès la
// création plutôt que de laisser le champ vide, clairement identifié comme
// un repli générique et non une hypothèse dédiée au dossier.
const FALLBACK_STRESS_VACANCY_ADD_PCT = 10;
const FALLBACK_STRESS_RENT_GROWTH_PCT = -1;
const FALLBACK_STRESS_EXIT_VALUE_HAIRCUT_PCT = 8;

function parseAssumptionValues(values: unknown): Partial<DefaultAssumptionValues & { capexByYear: Record<number, number> }> {
  if (!values || typeof values !== 'object') return {};
  return values as Partial<DefaultAssumptionValues & { capexByYear: Record<number, number> }>;
}

@Injectable()
export class FractionalProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Projects ───────────────────────────────────────────────

  async list(user: AuthenticatedUser) {
    return this.prisma.fractionalProject.findMany({
      where: { organizationId: user.organizationId, createdById: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { leases: true, capexItems: true, valuations: true } } },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findUnique({
      where: { id },
      include: {
        sourcesUses: true,
        leases: true,
        capexItems: true,
        valuations: true,
        vehicleStructure: { include: { platformProfile: true } },
        assumptionSets: true,
        stakeholders: { include: { feeDefinitions: true } },
        waterfallTiers: true,
      },
    });
    return assertOwned(project, user.id);
  }

  async create(dto: CreateFractionalProjectDto, user: AuthenticatedUser) {
    return this.prisma.fractionalProject.create({
      data: { ...dto, organizationId: user.organizationId, createdById: user.id },
    });
  }

  async update(id: string, dto: UpdateFractionalProjectDto, user: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.prisma.fractionalProject.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);
    await this.prisma.fractionalProject.delete({ where: { id } });
  }

  // ── Sources & Uses ─────────────────────────────────────────

  async upsertSourcesUses(projectId: string, dto: UpsertSourcesUsesDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    return this.prisma.fractionalSourcesUses.upsert({
      where: { projectId },
      create: { projectId, ...dto },
      update: dto,
    });
  }

  // ── Leases ─────────────────────────────────────────────────

  async createLease(projectId: string, dto: CreateLeaseDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    return this.prisma.fractionalLease.create({
      data: {
        projectId,
        tenantName: dto.tenantName,
        lotLabel: dto.lotLabel,
        surfaceM2: dto.surfaceM2,
        dateEffet: new Date(dto.dateEffet),
        dateTerme: new Date(dto.dateTerme),
        breakDates: dto.breakDates ?? [],
        loyerFacialAnnuel: dto.loyerFacialAnnuel,
        ervAnnuel: dto.ervAnnuel,
        indexation: dto.indexation as FractionalIndexationType | undefined,
        franchiseMois: dto.franchiseMois,
        chargesRecuperables: dto.chargesRecuperables,
        depotGarantieMontant: dto.depotGarantieMontant,
        statutRenouvellement: dto.statutRenouvellement as FractionalLeaseRenewalStatus | undefined,
        restrictionsCessionSousLocation: dto.restrictionsCessionSousLocation,
        repartitionTravaux: dto.repartitionTravaux,
        impayesNotes: dto.impayesNotes,
        notes: dto.notes,
      },
    });
  }

  async updateLease(projectId: string, leaseId: string, dto: UpdateLeaseDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const lease = await this.prisma.fractionalLease.findUnique({ where: { id: leaseId } });
    if (!lease || lease.projectId !== projectId) throw new NotFoundException('Bail introuvable.');
    return this.prisma.fractionalLease.update({
      where: { id: leaseId },
      data: {
        ...dto,
        dateEffet: dto.dateEffet ? new Date(dto.dateEffet) : undefined,
        dateTerme: dto.dateTerme ? new Date(dto.dateTerme) : undefined,
        indexation: dto.indexation as FractionalIndexationType | undefined,
        statutRenouvellement: dto.statutRenouvellement as FractionalLeaseRenewalStatus | undefined,
      },
    });
  }

  async removeLease(projectId: string, leaseId: string, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const lease = await this.prisma.fractionalLease.findUnique({ where: { id: leaseId } });
    if (!lease || lease.projectId !== projectId) throw new NotFoundException('Bail introuvable.');
    await this.prisma.fractionalLease.delete({ where: { id: leaseId } });
  }

  // ── CAPEX ──────────────────────────────────────────────────

  async createCapexItem(projectId: string, dto: CreateCapexItemDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    return this.prisma.fractionalCapexItem.create({
      data: { projectId, ...dto, responsable: dto.responsable as FractionalCapexResponsable | undefined },
    });
  }

  // ── Valuations ─────────────────────────────────────────────

  async createValuation(projectId: string, dto: CreateValuationDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    return this.prisma.fractionalValuation.create({
      data: { projectId, ...dto, method: dto.method as FractionalValuationMethod, asOfDate: new Date(dto.asOfDate) },
    });
  }

  // ── Vehicle structure ──────────────────────────────────────

  async upsertVehicleStructure(projectId: string, dto: UpsertVehicleStructureDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const data = { ...dto, maturity: dto.maturity ? new Date(dto.maturity) : undefined };
    return this.prisma.fractionalVehicleStructure.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: data,
    });
  }

  // ── Assumption sets ────────────────────────────────────────

  async upsertAssumptionSet(projectId: string, dto: UpsertAssumptionSetDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const existing = await this.prisma.fractionalAssumptionSet.findFirst({
      where: { projectId, scenario: dto.scenario },
      orderBy: { version: 'desc' },
    });
    return this.prisma.fractionalAssumptionSet.create({
      data: {
        projectId,
        scenario: dto.scenario,
        label: dto.label,
        values: dto.values as object,
        version: (existing?.version ?? 0) + 1,
        createdById: user.id,
      },
    });
  }

  // ── Platform profiles (org-scoped, pas createdById) ────────

  async listPlatformProfiles(user: AuthenticatedUser) {
    return this.prisma.platformFractionalProfile.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async createPlatformProfile(dto: CreatePlatformProfileDto, user: AuthenticatedUser) {
    return this.prisma.platformFractionalProfile.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
  }

  // ── Deal Economics — Stakeholders, Fees, Waterfall Tiers (spec §29) ──

  async createStakeholder(projectId: string, dto: CreateStakeholderDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    return this.prisma.fractionalStakeholder.create({ data: { projectId, ...dto } });
  }

  async removeStakeholder(projectId: string, stakeholderId: string, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const stakeholder = await this.prisma.fractionalStakeholder.findUnique({ where: { id: stakeholderId } });
    if (!stakeholder || stakeholder.projectId !== projectId) throw new NotFoundException('Partie prenante introuvable.');
    await this.prisma.fractionalStakeholder.delete({ where: { id: stakeholderId } });
  }

  async createFeeDefinition(projectId: string, dto: CreateFeeDefinitionDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const stakeholder = await this.prisma.fractionalStakeholder.findUnique({ where: { id: dto.stakeholderId } });
    if (!stakeholder || stakeholder.projectId !== projectId) throw new NotFoundException('Partie prenante introuvable.');
    return this.prisma.fractionalFeeDefinition.create({ data: { projectId, ...dto } });
  }

  async removeFeeDefinition(projectId: string, feeId: string, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const fee = await this.prisma.fractionalFeeDefinition.findUnique({ where: { id: feeId } });
    if (!fee || fee.projectId !== projectId) throw new NotFoundException('Frais introuvable.');
    await this.prisma.fractionalFeeDefinition.delete({ where: { id: feeId } });
  }

  async createWaterfallTier(projectId: string, dto: CreateWaterfallTierDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    if (dto.beneficiaryStakeholderId) {
      const stakeholder = await this.prisma.fractionalStakeholder.findUnique({ where: { id: dto.beneficiaryStakeholderId } });
      if (!stakeholder || stakeholder.projectId !== projectId) throw new NotFoundException('Partie prenante introuvable.');
    }
    return this.prisma.fractionalWaterfallTier.create({ data: { projectId, ...dto } });
  }

  async removeWaterfallTier(projectId: string, tierId: string, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const tier = await this.prisma.fractionalWaterfallTier.findUnique({ where: { id: tierId } });
    if (!tier || tier.projectId !== projectId) throw new NotFoundException('Tier de waterfall introuvable.');
    await this.prisma.fractionalWaterfallTier.delete({ where: { id: tierId } });
  }

  /**
   * Deal Economics (spec §29) — chemin OPT-IN : ne s'exécute que si le
   * dossier a au moins un stakeholder ET un tier de waterfall configurés,
   * sinon retourne null (le split simple income/capital share de
   * computeSynthese() reste la voie utilisée, inchangée). Réutilise le NOI/
   * CAPEX déjà calculés (annualManagementFeePct=0 pour obtenir un flux
   * "niveau actif" avant tout frais stakeholder — les frais RUNNING/
   * TRANSACTION/EXIT du dossier remplacent alors le simple
   * annualManagementFeePct du profil plateforme dans ce chemin).
   */
  async computeDealEconomics(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    if (project.stakeholders.length === 0 || project.waterfallTiers.length === 0) return null;
    if (!project.sourcesUses) {
      throw new ForbiddenException("Le dossier n'a pas encore de Sources & Uses saisi — impossible de calculer les Deal Economics.");
    }

    const asOfDate = new Date();
    const totalLoyerFacial = project.leases.reduce((sum, l) => sum + Number(l.loyerFacialAnnuel), 0);

    const baseAssumptionSet = project.assumptionSets.filter((a) => a.scenario === 'BASE').sort((a, b) => b.version - a.version)[0];
    const baseValues = { ...DEFAULT_ASSUMPTIONS, ...parseAssumptionValues(baseAssumptionSet?.values) };

    const latestValuation = project.valuations.sort((a, b) => b.asOfDate.getTime() - a.asOfDate.getTime())[0];
    const exitValue = baseValues.exitValueOverride ?? (latestValuation ? Number(latestValuation.value) : Number(project.sourcesUses.prixNetVendeur));

    const capexByYear: Record<number, number> = {};
    for (const item of project.capexItems) {
      const offset = item.annee - asOfDate.getFullYear() + 1;
      if (offset >= 1) capexByYear[offset] = (capexByYear[offset] ?? 0) + Number(item.montant);
    }

    const coutTotal =
      Number(project.sourcesUses.prixNetVendeur) +
      Number(project.sourcesUses.droitsNotaire) +
      Number(project.sourcesUses.honoraires) +
      Number(project.sourcesUses.travauxInitiaux) +
      Number(project.sourcesUses.capexDiffereReserve) +
      Number(project.sourcesUses.fraisPlateformeEntree) +
      Number(project.sourcesUses.reserveVacance) +
      Number(project.sourcesUses.reserveTravaux) +
      Number(project.sourcesUses.reserveTresorerie);

    const years: YearContext[] = [];
    for (let year = 1; year <= baseValues.holdPeriodYears; year++) {
      const gpr = totalLoyerFacial * Math.pow(1 + baseValues.rentGrowthPctPerYear / 100, year - 1);
      const yearResult = computeOperatingModelYear({
        year,
        grossPotentialRent: gpr,
        vacancyCreditLossPct: baseValues.vacancyCreditLossPct,
        opexPct: baseValues.opexPct,
        capexThisYear: capexByYear[year] ?? 0,
        annualManagementFeePct: 0,
        managementFeeBase: 0,
        incomeShareInvestorPct: 100,
      });
      years.push({
        year,
        prixNetVendeur: Number(project.sourcesUses.prixNetVendeur),
        coutTotal,
        assetValue: exitValue,
        grossPotentialRent: yearResult.grossPotentialRent,
        noi: yearResult.noi,
        capitalCollecte: Number(project.sourcesUses.collecteMontant),
        propertyLevelCashFlow: yearResult.distributableCashFlow,
      });
    }

    const netSaleProceeds = exitValue * (1 - baseValues.sellingCostsPct / 100);
    const plusValue = Math.max(0, netSaleProceeds - coutTotal);

    const stakeholders: StakeholderInput[] = project.stakeholders.map((s) => ({
      id: s.id,
      role: s.role,
      name: s.name,
      capitalEngaged: s.capitalEngaged !== null ? Number(s.capitalEngaged) : null,
    }));
    const feeDefinitions: FeeDefinitionInput[] = project.stakeholders.flatMap((s) =>
      s.feeDefinitions.map((f) => ({
        id: f.id,
        stakeholderId: f.stakeholderId,
        feeType: f.feeType,
        ratePct: f.ratePct !== null ? Number(f.ratePct) : null,
        fixedAmount: f.fixedAmount !== null ? Number(f.fixedAmount) : null,
        calculationBase: f.calculationBase,
        startYear: f.startYear,
        endYear: f.endYear,
      })),
    );
    const tiers: WaterfallTierInput[] = project.waterfallTiers
      .sort((a, b) => a.order - b.order)
      .map((t) => ({
        id: t.id,
        beneficiaryStakeholderId: t.beneficiaryStakeholderId,
        order: t.order,
        type: t.type,
        hurdleRatePct: t.hurdleRatePct !== null ? Number(t.hurdleRatePct) : null,
        catchUpPct: t.catchUpPct !== null ? Number(t.catchUpPct) : null,
        sharePct: t.sharePct !== null ? Number(t.sharePct) : null,
      }));

    const waterfallInput = { asOfDate, stakeholders, feeDefinitions, tiers, years, netSaleProceeds, plusValue };
    const result = computeStakeholderWaterfall(waterfallInput);

    const platformProfile = project.vehicleStructure?.platformProfile ?? null;
    const hurdlePct = platformProfile ? Number(platformProfile.minNetInvestorYieldPct) : 0;
    const reverseSolver = platformProfile
      ? { maxTotalFeeLoad: solveMaxTotalFeeLoad(waterfallInput, hurdlePct), maxCarry: solveMaxCarry(waterfallInput, hurdlePct) }
      : null;

    return { result, reverseSolver, hurdlePct };
  }

  // ── Synthèse (Returns Engine + Eligibility + Reverse Solver) ─

  /**
   * Assemble les entrées du Returns Engine pour un scénario donné (Base ou
   * un AssumptionSet stocké) puis calcule rendements + éligibilité. Le
   * scénario "stressed" retombe sur un haircut générique
   * (FALLBACK_STRESS_*) tant qu'aucun AssumptionSet BEAR/SEVERE dédié n'a
   * été saisi pour le dossier — jamais silencieux : le flag
   * `stressedIsFallback` l'indique à l'UI.
   */
  async computeSynthese(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    if (!project.sourcesUses) {
      throw new ForbiddenException("Le dossier n'a pas encore de Sources & Uses saisi — impossible de calculer la synthèse.");
    }

    const asOfDate = new Date();
    const leases: LeaseInput[] = project.leases.map((l) => ({
      id: l.id,
      tenantName: l.tenantName,
      loyerFacialAnnuel: Number(l.loyerFacialAnnuel),
      dateEffet: l.dateEffet,
      dateTerme: l.dateTerme,
      breakDates: (l.breakDates as string[] | null)?.map((d) => new Date(d)) ?? [],
      statutRenouvellement: l.statutRenouvellement,
    }));

    const baseAssumptionSet = project.assumptionSets.filter((a) => a.scenario === 'BASE').sort((a, b) => b.version - a.version)[0];
    const baseValues = { ...DEFAULT_ASSUMPTIONS, ...parseAssumptionValues(baseAssumptionSet?.values) };

    const latestValuation = project.valuations.sort((a, b) => b.asOfDate.getTime() - a.asOfDate.getTime())[0];
    const exitValueBase = baseValues.exitValueOverride ?? (latestValuation ? Number(latestValuation.value) : Number(project.sourcesUses.prixNetVendeur));

    const capexByYear: Record<number, number> = {};
    for (const item of project.capexItems) {
      const offset = item.annee - asOfDate.getFullYear() + 1;
      if (offset >= 1) capexByYear[offset] = (capexByYear[offset] ?? 0) + Number(item.montant);
    }

    const platformProfile = project.vehicleStructure?.platformProfile ?? null;
    const incomeShareInvestorPct = platformProfile ? Number(platformProfile.incomeShareInvestorPct) : 100;
    const capitalGainShareInvestorPct = platformProfile ? Number(platformProfile.capitalGainShareInvestorPct) : 100;
    const annualManagementFeePct = platformProfile ? Number(platformProfile.annualManagementFeePct) : 0;
    const hurdlePct = platformProfile ? Number(platformProfile.minNetInvestorYieldPct) : 0;

    const sourcesUsesInput = {
      prixNetVendeur: Number(project.sourcesUses.prixNetVendeur),
      droitsNotaire: Number(project.sourcesUses.droitsNotaire),
      honoraires: Number(project.sourcesUses.honoraires),
      travauxInitiaux: Number(project.sourcesUses.travauxInitiaux),
      capexDiffereReserve: Number(project.sourcesUses.capexDiffereReserve),
      fraisPlateformeEntree: Number(project.sourcesUses.fraisPlateformeEntree),
      reserveVacance: Number(project.sourcesUses.reserveVacance),
      reserveTravaux: Number(project.sourcesUses.reserveTravaux),
      reserveTresorerie: Number(project.sourcesUses.reserveTresorerie),
      collecteMontant: Number(project.sourcesUses.collecteMontant),
      sponsorEquity: Number(project.sourcesUses.sponsorEquity),
      detteEventuelle: Number(project.sourcesUses.detteEventuelle),
      autresSources: Number(project.sourcesUses.autresSources),
    };

    const baseInput: ReturnsEngineInput = {
      asOfDate,
      sourcesUses: sourcesUsesInput,
      leases,
      holdPeriodYears: baseValues.holdPeriodYears,
      vacancyCreditLossPct: baseValues.vacancyCreditLossPct,
      opexPct: baseValues.opexPct,
      annualManagementFeePct,
      incomeShareInvestorPct,
      capitalGainShareInvestorPct,
      rentGrowthPctPerYear: baseValues.rentGrowthPctPerYear,
      capexByYear,
      exitValue: exitValueBase,
      sellingCostsPct: baseValues.sellingCostsPct,
      materialityThresholdPct: baseValues.materialityThresholdPct,
    };

    const baseResult = computeReturnsEngine(baseInput);

    const stressAssumptionSet = project.assumptionSets
      .filter((a) => a.scenario === 'SEVERE' || a.scenario === 'BEAR')
      .sort((a, b) => b.version - a.version)[0];
    const stressedIsFallback = !stressAssumptionSet;
    const stressValues = stressAssumptionSet
      ? { ...baseValues, ...parseAssumptionValues(stressAssumptionSet.values) }
      : {
          ...baseValues,
          vacancyCreditLossPct: baseValues.vacancyCreditLossPct + FALLBACK_STRESS_VACANCY_ADD_PCT,
          rentGrowthPctPerYear: FALLBACK_STRESS_RENT_GROWTH_PCT,
        };
    const exitValueStress = stressAssumptionSet
      ? (stressValues.exitValueOverride ?? exitValueBase)
      : exitValueBase * (1 - FALLBACK_STRESS_EXIT_VALUE_HAIRCUT_PCT / 100);

    const stressResult = computeReturnsEngine({ ...baseInput, ...stressValues, exitValue: exitValueStress });

    const eligibility = computeEligibility(baseResult.securedNetYieldPct, hurdlePct);

    let reverseSolver: { maxAcquisitionPrice: ReturnType<typeof solveMaxAcquisitionPrice>; minSecuredRent: ReturnType<typeof solveMinSecuredRent> } | null = null;
    if (platformProfile) {
      reverseSolver = {
        maxAcquisitionPrice: solveMaxAcquisitionPrice(baseInput, hurdlePct),
        minSecuredRent: solveMinSecuredRent(baseInput, hurdlePct),
      };
    }

    return {
      base: baseResult,
      stressed: stressResult,
      stressedIsFallback,
      eligibility,
      reverseSolver,
      hurdlePct,
      platformProfile,
    };
  }
}
