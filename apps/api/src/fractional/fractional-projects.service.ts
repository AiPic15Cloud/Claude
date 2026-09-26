import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { FractionalLeaseRenewalStatus, FractionalIndexationType, FractionalCapexResponsable, FractionalValuationMethod } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateFractionalProjectDto } from './dto/create-fractional-project.dto';
import { UpdateFractionalProjectDto } from './dto/update-fractional-project.dto';
import { UpsertSourcesUsesDto } from './dto/upsert-sources-uses.dto';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { CreateCapexItemDto } from './dto/create-capex-item.dto';
import { UpdateCapexItemDto } from './dto/update-capex-item.dto';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { UpdateValuationDto } from './dto/update-valuation.dto';
import { UpsertVehicleStructureDto } from './dto/upsert-vehicle-structure.dto';
import { CreatePlatformProfileDto } from './dto/create-platform-profile.dto';
import { UpsertAssumptionSetDto } from './dto/upsert-assumption-set.dto';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { CreateFeeDefinitionDto } from './dto/create-fee-definition.dto';
import { CreateWaterfallTierDto } from './dto/create-waterfall-tier.dto';
import { computeReturnsEngine, type ReturnsEngineInput } from './returns.util';
import { computeEligibility } from './eligibility.util';
import { solveMaxAcquisitionPrice, solveMinSecuredRent, solveMaxVacancyCreditLossPct, solveMaxAdditionalCapex, solveLeasesToSecure } from './reverse-solver.util';
import { computeStakeholderWaterfall, solveMaxTotalFeeLoad, solveMaxCarry, type StakeholderInput, type FeeDefinitionInput, type WaterfallTierInput } from './stakeholder-waterfall.util';
import { buildScenarioWaterfallInput, computeAllDealEconomicsStressScenarios, type DealEconomicsScenarioContext } from './stakeholder-waterfall-stress.util';
import { computeIndexGrowthRates, type IndexGrowthRates } from './rent-indexation.util';
import { computeLeaseLegalReview } from './lease-legal-review.util';
import type { LeaseInput } from './lease-security.util';
import { computeTenantCovenantScore } from './tenant-covenant.util';
import { computeAllStressScenarios, computeAllBreakEventScenarios, computeBreakEventScenario } from './stress-testing.util';
import { DataProvenanceService } from './data-provenance.service';
import { MarketIndicatorsService } from '../intelligence-marche/indicators.service';
import { computeCapRateBuildUp, compareToImpliedCapRate, type PropertyConditionTier, type LocationTier, type MarketDepth } from './cap-rate-build-up.util';
import { computePortfolioReversion } from './rental-reversion.util';
import { resolveLeaseBreakEconomics, type LeaseBreakInput } from './break-event.util';
import { computeTenantReplacementCost, type TenantReplacementCostBreakdown } from './tenant-replacement-cost.util';
import { computeICRecommendation } from './ic-engine.util';
import { computeDCFValuation } from './dcf-valuation.util';
import { computePerformanceAttribution } from './performance-attribution.util';
import { findComparables, type ComparableFeatures } from './comparable-engine.util';
import { CreateICDecisionDto } from './dto/create-ic-decision.dto';
import { CreateProjectActualDto } from './dto/create-project-actual.dto';
import { UpsertProjectOutcomeDto } from './dto/upsert-project-outcome.dto';
import { MarketDataService } from './market-data.service';
import { EsgRiskService } from './esg-risk.service';
import { computeExitYieldEngine, computeCapRateSensitivity, computeNoiSensitivity, median, solveMaxExitYieldExpansion } from './exit-yield.util';

interface DefaultAssumptionValues {
  holdPeriodYears: number;
  vacancyCreditLossPct: number;
  opexPct: number;
  rentGrowthPctPerYear: number;
  sellingCostsPct: number;
  materialityThresholdPct: number;
  /** Taux d'actualisation utilisé par la valorisation DCF (dcf-valuation.util.ts) — distinct du hurdle plateforme, jugement de marché sur le risque de l'actif. */
  discountRatePct: number;
  exitValueOverride?: number;
  /**
   * Cap Rate Build-Up (Complément H, H.3, cap-rate-build-up.util.ts) —
   * absents tant que le dossier n'a pas été qualifié : jamais un profil
   * deviné (CORE/Paris QCA par défaut serait une hypothèse silencieuse
   * optimiste). tec10PctOverride prévaut sur le taux live (intelligence
   * marché) quand renseigné, pour figer la valeur utilisée dans un
   * underwriting donné (traçabilité).
   */
  propertyCondition?: PropertyConditionTier;
  locationTier?: LocationTier;
  marketDepth?: MarketDepth;
  tec10PctOverride?: number;
}

const DEFAULT_ASSUMPTIONS: DefaultAssumptionValues = {
  holdPeriodYears: 5,
  vacancyCreditLossPct: 3,
  opexPct: 15,
  rentGrowthPctPerYear: 1.5,
  sellingCostsPct: 6,
  materialityThresholdPct: 5,
  discountRatePct: 7,
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

/**
 * Convertit une année calendaire (ex. CAPEX/actuals `annee`) en offset
 * 1-indexé relatif à `asOfDate`, tel qu'attendu par capexByYear/yearlyModel
 * du Returns Engine (année 1 = l'année de asOfDate). Partagé par
 * buildDealEconomicsContext, buildReturnsEngineInput et
 * computePerformanceAttributionForProject, qui appliquaient jusqu'ici la
 * même formule dupliquée trois fois.
 */
function yearOffsetFromAsOfDate(annee: number, asOfDate: Date): number {
  return annee - asOfDate.getFullYear() + 1;
}

@Injectable()
export class FractionalProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataProvenance: DataProvenanceService,
    private readonly marketIndicators: MarketIndicatorsService,
    private readonly marketData: MarketDataService,
    private readonly esgRisk: EsgRiskService,
  ) {}

  // ── Projects ───────────────────────────────────────────────
  //
  // Visibilité au niveau organisation (comme le reste de la plateforme —
  // cf. DealsService.findOne — organizationId, jamais createdById) : un
  // dossier Fractionné créé par un analyste reste visible par le reste de
  // l'organisation, remonté au même titre que les Deals. createdById est
  // conservé sur chaque ligne pour la traçabilité (qui a créé quoi) mais
  // n'est plus un filtre de visibilité — c'était une hypothèse posée par
  // défaut en P0 (patch V3.2 §1), jamais le bon modèle pour un usage en
  // équipe. Les mutations restent gouvernées par rôle (RolesGuard/@Roles
  // ADMIN|ANALYST côté contrôleur), pas par la propriété du dossier — même
  // principe que DealsController.

  async list(user: AuthenticatedUser) {
    return this.prisma.fractionalProject.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { leases: true, capexItems: true, valuations: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      // Plafond de sécurité — le consommateur front (use-fractional.ts,
      // useFractionalProjects) affiche la liste complète sans pagination ;
      // même pattern que GraphService.listEntities / getGraph pour éviter
      // une réponse non bornée sans changer la forme de la réponse.
      take: 1000,
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        sourcesUses: true,
        leases: true,
        capexItems: true,
        valuations: true,
        vehicleStructure: { include: { platformProfile: true } },
        assumptionSets: true,
        stakeholders: { include: { feeDefinitions: true } },
        waterfallTiers: true,
        icDecisions: { orderBy: { decidedAt: 'desc' } },
        actuals: { orderBy: { period: 'desc' } },
        outcome: true,
      },
    });
    if (!project) throw new NotFoundException('Dossier Fractionné introuvable.');
    return project;
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
        indexationCapPct: dto.indexationCapPct,
        indexationFloorPct: dto.indexationFloorPct,
        franchiseMois: dto.franchiseMois,
        chargesRecuperables: dto.chargesRecuperables,
        depotGarantieMontant: dto.depotGarantieMontant,
        statutRenouvellement: dto.statutRenouvellement as FractionalLeaseRenewalStatus | undefined,
        restrictionsCessionSousLocation: dto.restrictionsCessionSousLocation,
        repartitionTravaux: dto.repartitionTravaux,
        impayesNotes: dto.impayesNotes,
        notes: dto.notes,
        sirenLocataire: dto.sirenLocataire,
        procedureCollective: dto.procedureCollective,
        garantieMaisonMere: dto.garantieMaisonMere,
        caLocataireAnnuel: dto.caLocataireAnnuel,
        ebitdaLocataireAnnuel: dto.ebitdaLocataireAnnuel,
        tresorerieLocataire: dto.tresorerieLocataire,
        exerciceFinancierAsOf: dto.exerciceFinancierAsOf ? new Date(dto.exerciceFinancierAsOf) : undefined,
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
        exerciceFinancierAsOf: dto.exerciceFinancierAsOf ? new Date(dto.exerciceFinancierAsOf) : undefined,
      },
    });
  }

  async removeLease(projectId: string, leaseId: string, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const lease = await this.prisma.fractionalLease.findUnique({ where: { id: leaseId } });
    if (!lease || lease.projectId !== projectId) throw new NotFoundException('Bail introuvable.');
    await this.prisma.fractionalLease.delete({ where: { id: leaseId } });
  }

  /**
   * Module juridique — recommandations de qualité par bail
   * (lease-legal-review.util.ts) : checklist actionnable (échéance proche,
   * renouvellement non formalisé, procédure collective, garanties...),
   * distincte du Lease Security Engine qui répond à une question différente
   * ("quel revenu est sécurisé ?" plutôt que "qu'est-ce qu'il faut faire ?").
   */
  async computeLegalReview(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const asOfDate = new Date();
    return project.leases.map((l) => ({
      leaseId: l.id,
      tenantName: l.tenantName,
      ...computeLeaseLegalReview(
        {
          dateEffet: l.dateEffet,
          dateTerme: l.dateTerme,
          breakDates: (l.breakDates as string[] | null)?.map((d) => new Date(d)) ?? [],
          statutRenouvellement: l.statutRenouvellement,
          procedureCollective: l.procedureCollective,
          impayesNotes: l.impayesNotes,
          depotGarantieMontant: l.depotGarantieMontant !== null ? Number(l.depotGarantieMontant) : null,
          loyerFacialAnnuel: Number(l.loyerFacialAnnuel),
          restrictionsCessionSousLocation: l.restrictionsCessionSousLocation,
          repartitionTravaux: l.repartitionTravaux,
          sirenLocataire: l.sirenLocataire,
        },
        asOfDate,
      ),
    }));
  }

  // ── CAPEX ──────────────────────────────────────────────────

  async createCapexItem(projectId: string, dto: CreateCapexItemDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    return this.prisma.fractionalCapexItem.create({
      data: { projectId, ...dto, responsable: dto.responsable as FractionalCapexResponsable | undefined },
    });
  }

  async updateCapexItem(projectId: string, capexItemId: string, dto: UpdateCapexItemDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const item = await this.prisma.fractionalCapexItem.findUnique({ where: { id: capexItemId } });
    if (!item || item.projectId !== projectId) throw new NotFoundException('Poste CAPEX introuvable.');
    return this.prisma.fractionalCapexItem.update({
      where: { id: capexItemId },
      data: { ...dto, responsable: dto.responsable as FractionalCapexResponsable | undefined },
    });
  }

  async removeCapexItem(projectId: string, capexItemId: string, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const item = await this.prisma.fractionalCapexItem.findUnique({ where: { id: capexItemId } });
    if (!item || item.projectId !== projectId) throw new NotFoundException('Poste CAPEX introuvable.');
    await this.prisma.fractionalCapexItem.delete({ where: { id: capexItemId } });
  }

  // ── Valuations ─────────────────────────────────────────────

  async createValuation(projectId: string, dto: CreateValuationDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    return this.prisma.fractionalValuation.create({
      data: { projectId, ...dto, method: dto.method as FractionalValuationMethod, asOfDate: new Date(dto.asOfDate) },
    });
  }

  async updateValuation(projectId: string, valuationId: string, dto: UpdateValuationDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const valuation = await this.prisma.fractionalValuation.findUnique({ where: { id: valuationId } });
    if (!valuation || valuation.projectId !== projectId) throw new NotFoundException('Valorisation introuvable.');
    return this.prisma.fractionalValuation.update({
      where: { id: valuationId },
      data: { ...dto, method: dto.method as FractionalValuationMethod | undefined, asOfDate: dto.asOfDate ? new Date(dto.asOfDate) : undefined },
    });
  }

  async removeValuation(projectId: string, valuationId: string, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const valuation = await this.prisma.fractionalValuation.findUnique({ where: { id: valuationId } });
    if (!valuation || valuation.projectId !== projectId) throw new NotFoundException('Valorisation introuvable.');
    await this.prisma.fractionalValuation.delete({ where: { id: valuationId } });
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
  /**
   * Ingrédients bruts partagés par computeDealEconomics (scénario BASE) et
   * computeDealEconomicsStressTests (les 10 scénarios) — factorisé pour ne
   * mapper les lignes Prisma (stakeholders/fees/tiers/leases/capex) qu'une
   * fois, buildScenarioWaterfallInput() de stakeholder-waterfall-stress.util.ts
   * appliquant ensuite les chocs par scénario sur ce contexte commun.
   */
  private async buildDealEconomicsContext(projectId: string, user: AuthenticatedUser): Promise<DealEconomicsScenarioContext | null> {
    const project = await this.findOne(projectId, user);
    if (project.stakeholders.length === 0 || project.waterfallTiers.length === 0) return null;
    if (!project.sourcesUses) {
      throw new ForbiddenException("Le dossier n'a pas encore de Sources & Uses saisi — impossible de calculer les Deal Economics.");
    }

    const asOfDate = new Date();
    const indexGrowthRates = await this.getIndexGrowthRates(user.organizationId);
    const leases = project.leases.map((l) => ({
      id: l.id,
      loyerFacialAnnuel: Number(l.loyerFacialAnnuel),
      indexation: l.indexation,
      indexationCapPct: l.indexationCapPct !== null ? Number(l.indexationCapPct) : null,
      indexationFloorPct: l.indexationFloorPct !== null ? Number(l.indexationFloorPct) : null,
    }));

    const baseAssumptionSet = project.assumptionSets.filter((a) => a.scenario === 'BASE').sort((a, b) => b.version - a.version)[0];
    const baseValues = { ...DEFAULT_ASSUMPTIONS, ...parseAssumptionValues(baseAssumptionSet?.values) };

    const latestValuation = project.valuations.sort((a, b) => b.asOfDate.getTime() - a.asOfDate.getTime())[0];
    const exitValueBase = baseValues.exitValueOverride ?? (latestValuation ? Number(latestValuation.value) : Number(project.sourcesUses.prixNetVendeur));

    const capexByYear: Record<number, number> = {};
    for (const item of project.capexItems) {
      const offset = yearOffsetFromAsOfDate(item.annee, asOfDate);
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
        minAmount: f.minAmount !== null ? Number(f.minAmount) : null,
        maxAmount: f.maxAmount !== null ? Number(f.maxAmount) : null,
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

    const platformProfile = project.vehicleStructure?.platformProfile ?? null;

    return {
      asOfDate,
      holdPeriodYears: baseValues.holdPeriodYears,
      vacancyCreditLossPct: baseValues.vacancyCreditLossPct,
      opexPct: baseValues.opexPct,
      rentGrowthPctPerYear: baseValues.rentGrowthPctPerYear,
      indexGrowthRates,
      leases,
      capexByYear,
      exitValueBase,
      sellingCostsPct: baseValues.sellingCostsPct,
      coutTotal,
      prixNetVendeur: Number(project.sourcesUses.prixNetVendeur),
      collecteMontant: Number(project.sourcesUses.collecteMontant),
      stakeholders,
      feeDefinitions,
      tiers,
      hurdlePct: platformProfile ? Number(platformProfile.minNetInvestorYieldPct) : 0,
      hasPlatformProfile: Boolean(platformProfile),
    };
  }

  async computeDealEconomics(projectId: string, user: AuthenticatedUser) {
    const context = await this.buildDealEconomicsContext(projectId, user);
    if (!context) return null;

    const waterfallInput = buildScenarioWaterfallInput(context, 'BASE');
    const result = computeStakeholderWaterfall(waterfallInput);
    const reverseSolver = context.hasPlatformProfile
      ? { maxTotalFeeLoad: solveMaxTotalFeeLoad(waterfallInput, context.hurdlePct), maxCarry: solveMaxCarry(waterfallInput, context.hurdlePct) }
      : null;

    return { result, reverseSolver, hurdlePct: context.hurdlePct };
  }

  /**
   * Stress Testing × Deal Economics (spec §29.9) — les mêmes 10 scénarios
   * que computeStressTests(), mais rejoués à travers le moteur
   * multi-stakeholder : montre l'effet d'une vacance ou d'un défaut
   * locataire sur le TRI de CHAQUE partie prenante (pas seulement
   * l'investisseur du split simple), condition explicitement demandée.
   * Retourne null si le dossier n'a pas de stakeholders/tiers configurés
   * (même règle opt-in que computeDealEconomics).
   */
  async computeDealEconomicsStressTests(projectId: string, user: AuthenticatedUser) {
    const context = await this.buildDealEconomicsContext(projectId, user);
    if (!context) return null;
    return computeAllDealEconomicsStressScenarios(context);
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
  /**
   * Assemble un ReturnsEngineInput à partir des données brutes du dossier —
   * factorisé pour être réutilisé par computeSynthese, computeStressTests
   * et computeICRecommendation sans dupliquer le mapping Prisma→moteur.
   */
  /** Séries d'indices de référence de l'organisation → taux de croissance par indice (rent-indexation.util.ts), partagées au niveau organisation (patch V3.2 §2), jamais par dossier. */
  private async getIndexGrowthRates(organizationId: string): Promise<IndexGrowthRates> {
    const series = await this.prisma.rentIndexSeries.findMany({ where: { organizationId } });
    return computeIndexGrowthRates(
      series.map((s) => ({ indexType: s.indexType, cagr5y: s.cagr5y !== null ? Number(s.cagr5y) : null, asOfDate: s.asOfDate })),
    );
  }

  private async buildReturnsEngineInput(project: Awaited<ReturnType<FractionalProjectsService['findOne']>>, organizationId: string) {
    if (!project.sourcesUses) {
      throw new ForbiddenException("Le dossier n'a pas encore de Sources & Uses saisi — impossible de calculer la synthèse.");
    }

    const asOfDate = new Date();
    const indexGrowthRates = await this.getIndexGrowthRates(organizationId);
    const leases: LeaseInput[] = project.leases.map((l) => ({
      id: l.id,
      tenantName: l.tenantName,
      loyerFacialAnnuel: Number(l.loyerFacialAnnuel),
      dateEffet: l.dateEffet,
      dateTerme: l.dateTerme,
      breakDates: (l.breakDates as string[] | null)?.map((d) => new Date(d)) ?? [],
      statutRenouvellement: l.statutRenouvellement,
      indexation: l.indexation,
      indexationCapPct: l.indexationCapPct !== null ? Number(l.indexationCapPct) : null,
      indexationFloorPct: l.indexationFloorPct !== null ? Number(l.indexationFloorPct) : null,
      ervAnnuel: l.ervAnnuel !== null ? Number(l.ervAnnuel) : null,
      covenantScore: computeTenantCovenantScore({
        sirenLocataire: l.sirenLocataire,
        procedureCollective: l.procedureCollective,
        garantieMaisonMere: l.garantieMaisonMere,
        statutRenouvellement: l.statutRenouvellement,
        depotGarantieMontant: l.depotGarantieMontant !== null ? Number(l.depotGarantieMontant) : null,
        loyerFacialAnnuel: Number(l.loyerFacialAnnuel),
        impayesNotes: l.impayesNotes,
        caLocataireAnnuel: l.caLocataireAnnuel !== null ? Number(l.caLocataireAnnuel) : null,
        ebitdaLocataireAnnuel: l.ebitdaLocataireAnnuel !== null ? Number(l.ebitdaLocataireAnnuel) : null,
        tresorerieLocataire: l.tresorerieLocataire !== null ? Number(l.tresorerieLocataire) : null,
      }).score,
    }));

    const baseAssumptionSet = project.assumptionSets.filter((a) => a.scenario === 'BASE').sort((a, b) => b.version - a.version)[0];
    const baseValues = { ...DEFAULT_ASSUMPTIONS, ...parseAssumptionValues(baseAssumptionSet?.values) };

    const latestValuation = project.valuations.sort((a, b) => b.asOfDate.getTime() - a.asOfDate.getTime())[0];
    const exitValueBase = baseValues.exitValueOverride ?? (latestValuation ? Number(latestValuation.value) : Number(project.sourcesUses.prixNetVendeur));

    const capexByYear: Record<number, number> = {};
    for (const item of project.capexItems) {
      const offset = yearOffsetFromAsOfDate(item.annee, asOfDate);
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
      indexGrowthRates,
      capexByYear,
      exitValue: exitValueBase,
      sellingCostsPct: baseValues.sellingCostsPct,
      materialityThresholdPct: baseValues.materialityThresholdPct,
      tva: {
        regimeTva: project.sourcesUses.regimeTva,
        tauxPct: project.sourcesUses.tvaTauxPct !== null ? Number(project.sourcesUses.tvaTauxPct) : null,
        recuperationDelaiMois: project.sourcesUses.tvaRecuperationDelaiMois,
      },
    };

    // Aucune ligne CapexItem saisie ≠ CAPEX confirmé à zéro (spec V2 §10,
    // "Unknown ≠ Zero") — capexByYear reste {} dans les deux cas, ce booléen
    // est le seul moyen pour l'appelant (IC engine, UI) de distinguer les deux.
    const capexDataMissing = project.capexItems.length === 0;

    return { baseInput, baseValues, exitValueBase, platformProfile, hurdlePct, capexDataMissing };
  }

  async computeSynthese(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const { baseInput, baseValues, exitValueBase, platformProfile, hurdlePct, capexDataMissing } = await this.buildReturnsEngineInput(project, user.organizationId);

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

    // Le scénario stressé (AssumptionSet BEAR/SEVERE ou haircut FALLBACK_STRESS_*)
    // ne réécrit que rentGrowthPctPerYear/vacancyCreditLossPct/exitValue : sans
    // remettre indexGrowthRates à {}, un bail indexé ILC/ILAT/IRL/ICC garderait
    // le taux de marché "live" de baseInput (resolveLeaseGrowthPct le préfère
    // au taux de repli — rent-indexation.util.ts) et échapperait au stress test,
    // exactement comme RENT_DOWNSIDE le corrige déjà dans stress-testing.util.ts.
    const stressResult = computeReturnsEngine({ ...baseInput, ...stressValues, exitValue: exitValueStress, indexGrowthRates: {} });

    const eligibility = computeEligibility(
      baseInput.sourcesUses.collecteMontant > 0 ? baseResult.securedNetYieldPct : null,
      platformProfile ? hurdlePct : null,
    );

    let reverseSolver: {
      maxAcquisitionPrice: ReturnType<typeof solveMaxAcquisitionPrice>;
      minSecuredRent: ReturnType<typeof solveMinSecuredRent>;
      maxVacancyCreditLossPct: ReturnType<typeof solveMaxVacancyCreditLossPct>;
      maxAdditionalCapex: ReturnType<typeof solveMaxAdditionalCapex>;
      leasesToSecure: ReturnType<typeof solveLeasesToSecure>;
    } | null = null;
    if (platformProfile) {
      reverseSolver = {
        maxAcquisitionPrice: solveMaxAcquisitionPrice(baseInput, hurdlePct),
        minSecuredRent: solveMinSecuredRent(baseInput, hurdlePct),
        maxVacancyCreditLossPct: solveMaxVacancyCreditLossPct(baseInput, hurdlePct),
        maxAdditionalCapex: solveMaxAdditionalCapex(baseInput, hurdlePct),
        leasesToSecure: solveLeasesToSecure(baseInput, hurdlePct),
      };
    }

    const dcfValuation = computeDCFValuation({
      yearlyCashFlows: baseResult.yearlyModel.map((y) => ({ year: y.year, noi: y.noi, capex: y.capex })),
      discountRatePct: baseValues.discountRatePct,
      terminalValue: exitValueBase,
    });

    return {
      base: baseResult,
      stressed: stressResult,
      stressedIsFallback,
      eligibility,
      reverseSolver,
      hurdlePct,
      platformProfile,
      dcfValuation,
      capexDataMissing,
    };
  }

  // ── Cap Rate Build-Up Engine (Complément H, H.3) ────────────

  private async resolveTec10Pct(tec10PctOverride: number | undefined): Promise<{ value: number | null; source: 'OVERRIDE' | 'LIVE' | 'MISSING'; asOf: string | null }> {
    if (tec10PctOverride !== undefined) return { value: tec10PctOverride, source: 'OVERRIDE', asOf: null };
    try {
      const summary = await this.marketIndicators.summary();
      if (summary.oat10y.value !== null) return { value: summary.oat10y.value, source: 'LIVE', asOf: summary.oat10y.period };
    } catch {
      // Source de marché indisponible (réseau, API) — traité comme donnée manquante, jamais un taux inventé.
    }
    return { value: null, source: 'MISSING', asOf: null };
  }

  async getCapRateBuildUpForProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const { baseInput, baseValues } = await this.buildReturnsEngineInput(project, user.organizationId);

    if (!baseValues.propertyCondition || !baseValues.locationTier || !baseValues.marketDepth) {
      return { status: 'NOT_QUALIFIED' as const };
    }

    const tec10 = await this.resolveTec10Pct(baseValues.tec10PctOverride);
    if (tec10.value === null) return { status: 'TEC10_MISSING' as const };

    const baseResult = computeReturnsEngine(baseInput);

    // Prime ESG (spec §12/§28 — "l'ESG doit être traduit en impacts économiques") :
    // réutilise le même moteur que l'onglet ESG dédié (esg-risk.util.ts via
    // EsgRiskService), jamais un second calcul de la prime. L'absence
    // d'évaluation ESG y est déjà traitée comme le pire cas plausible (même
    // principe que la prime de liquidité ci-dessous pour un WALB manquant) —
    // Cap Rate Build-Up doit rester cohérent avec ce que montre l'onglet ESG,
    // pas silencieusement plus optimiste.
    const { profile: esgProfile } = await this.esgRisk.getProfile(projectId, user);
    const esgPremiumPct = esgProfile.totalValuationImpactPts;

    const entryBuildUp = computeCapRateBuildUp({
      tec10Pct: tec10.value,
      propertyCondition: baseValues.propertyCondition,
      locationTier: baseValues.locationTier,
      marketDepth: baseValues.marketDepth,
      walbYears: baseResult.leaseSecurity.walbYears,
      esgPremiumPct,
    });
    const entry = compareToImpliedCapRate(entryBuildUp, baseResult.netPropertyYieldPct);

    // WALB à la sortie ≈ WALB à l'achat moins la durée de détention (approximation
    // simple, cohérente avec le reste du module qui ne modélise pas de bail
    // supplémentaire signé en cours de détention) — jamais négatif.
    const walbAtExit = baseResult.leaseSecurity.walbYears !== null ? Math.max(0, baseResult.leaseSecurity.walbYears - baseValues.holdPeriodYears) : null;
    const exitBuildUp = computeCapRateBuildUp({
      tec10Pct: tec10.value,
      propertyCondition: baseValues.propertyCondition,
      locationTier: baseValues.locationTier,
      marketDepth: baseValues.marketDepth,
      walbYears: walbAtExit,
      esgPremiumPct,
    });
    const lastYear = baseResult.yearlyModel[baseResult.yearlyModel.length - 1];
    const impliedExitYieldPct = lastYear && baseInput.exitValue > 0 ? (lastYear.noi / baseInput.exitValue) * 100 : 0;
    const exit = compareToImpliedCapRate(exitBuildUp, impliedExitYieldPct);

    return { status: 'OK' as const, tec10Source: tec10.source, tec10AsOf: tec10.asOf, entry, exit };
  }

  // ── Exit Yield Engine (spec V3.1 §11.1) ─────────────────────

  /**
   * Réutilise le Cap Rate Build-Up (getCapRateBuildUpForProject ci-dessus) —
   * mêmes prérequis (propertyCondition/locationTier/marketDepth + TEC10),
   * mêmes statuts NOT_QUALIFIED/TEC10_MISSING, jamais une seconde
   * implémentation de la logique de qualification. Entry Yield = yield
   * réellement payé (entry.impliedCapRatePct) ; Base Exit Yield = hypothèse
   * prospective Atlas (exit.buildUp.capRatePct), jamais dérivée de la
   * valeur de sortie saisie par l'utilisateur ; Market Yield = médiane des
   * comparables VENTE de la commune du projet, null si le pool est vide
   * (Unknown ≠ Zero) — table MarketComparablePool partagée (patch V3.2 §2),
   * jamais une valeur ressaisie par dossier.
   */
  async getExitYieldEngineForProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const capRateBuildUp = await this.getCapRateBuildUpForProject(projectId, user);
    if (capRateBuildUp.status !== 'OK') return { status: capRateBuildUp.status };

    const { baseInput, platformProfile, hurdlePct } = await this.buildReturnsEngineInput(project, user.organizationId);
    const baseResult = computeReturnsEngine(baseInput);
    const lastYear = baseResult.yearlyModel[baseResult.yearlyModel.length - 1];
    const lastYearNoi = lastYear?.noi ?? 0;
    const acquisitionValueEur = baseResult.sourcesUsesResult.coutActeEnMain;

    const comparables = project.city ? await this.marketData.listMarketComparables(user, project.city) : [];
    const saleYields = comparables.filter((c) => c.type === 'VENTE' && c.yieldPct !== null).map((c) => Number(c.yieldPct));
    const marketYieldPct = median(saleYields);

    const engine = computeExitYieldEngine({
      entryYieldPct: capRateBuildUp.entry.impliedCapRatePct,
      marketYieldPct,
      baseExitYieldPct: capRateBuildUp.exit.buildUp.capRatePct,
      lastYearNoi,
      acquisitionValueEur,
    });

    return {
      status: 'OK' as const,
      ...engine,
      capRateSensitivity: computeCapRateSensitivity(engine.scenarios[0].exitYieldPct, lastYearNoi, acquisitionValueEur),
      noiSensitivity: computeNoiSensitivity(engine.scenarios[0].exitYieldPct, lastYearNoi, acquisitionValueEur),
      maxExitYieldExpansion: platformProfile ? solveMaxExitYieldExpansion(baseInput, capRateBuildUp.exit.buildUp.capRatePct, lastYearNoi, hurdlePct) : null,
    };
  }

  // ── Rental Market & Rental Reversion Engine (spec V3.1 §9) ──

  async getRentalReversionForProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const { baseInput } = await this.buildReturnsEngineInput(project, user.organizationId);
    return computePortfolioReversion(
      baseInput.leases.map((l) => ({ id: l.id, tenantName: l.tenantName, loyerFacialAnnuel: l.loyerFacialAnnuel, ervAnnuel: l.ervAnnuel })),
    );
  }

  // ── Tenant Replacement Cost Engine (spec V3.1 §10) ──────────

  /**
   * Décompose, pour chaque bail ayant une échéance (break ou terme) dans
   * l'horizon de détention, le coût économique complet d'un départ
   * locataire (DOWNSIDE/SEVERE) — jamais recalculé, réutilise le CAPEX de
   * relocation déjà produit par break-event.util.ts (resolveLeaseBreakEconomics),
   * partagé avec le cash-flow projeté.
   */
  async getTenantReplacementCostForProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const { baseValues } = await this.buildReturnsEngineInput(project, user.organizationId);
    const indexGrowthRates = await this.getIndexGrowthRates(user.organizationId);
    const asOfDate = new Date();

    const results: Record<'DOWNSIDE' | 'SEVERE', TenantReplacementCostBreakdown[]> = { DOWNSIDE: [], SEVERE: [] };

    for (const lease of project.leases) {
      const leaseBreakInput: LeaseBreakInput = {
        loyerFacialAnnuel: Number(lease.loyerFacialAnnuel),
        indexation: lease.indexation,
        indexationCapPct: lease.indexationCapPct !== null ? Number(lease.indexationCapPct) : null,
        indexationFloorPct: lease.indexationFloorPct !== null ? Number(lease.indexationFloorPct) : null,
        dateEffet: lease.dateEffet,
        dateTerme: lease.dateTerme,
        breakDates: (lease.breakDates as string[] | null)?.map((d) => new Date(d)) ?? [],
        ervAnnuel: lease.ervAnnuel !== null ? Number(lease.ervAnnuel) : null,
      };

      for (const scenario of ['DOWNSIDE', 'SEVERE'] as const) {
        const economics = resolveLeaseBreakEconomics(leaseBreakInput, indexGrowthRates, baseValues.rentGrowthPctPerYear, asOfDate, scenario);
        // Hors périmètre : pas de break dans l'horizon, ou break au-delà de la
        // détention prévue — sans pertinence pour la décision en cours.
        if (!economics.hasBreakInHorizon || economics.breakYear > baseValues.holdPeriodYears) continue;

        results[scenario].push(
          computeTenantReplacementCost({
            leaseId: lease.id,
            tenantName: lease.tenantName,
            preBreakAnnualRent: economics.preBreakRentAtBreakYear,
            vacancyMonths: economics.vacancyMonths,
            relettingCapexTotal: economics.relettingCapexTotal,
            reletAnnualRent: economics.reletAnnualRentBase,
            opexPct: baseValues.opexPct,
            chargesRecuperables: lease.chargesRecuperables,
          }),
        );
      }
    }

    return results;
  }

  // ── Stress Testing & Sensitivity Engine (spec §18) ──────────

  async computeStressTests(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const { baseInput, hurdlePct, platformProfile } = await this.buildReturnsEngineInput(project, user.organizationId);
    const hasPlatformProfile = Boolean(platformProfile);
    return [
      ...computeAllStressScenarios(baseInput, hurdlePct, hasPlatformProfile),
      ...computeAllBreakEventScenarios(baseInput, hurdlePct, hasPlatformProfile),
    ];
  }

  // ── IC Engine (spec §17) ─────────────────────────────────────

  async computeICRecommendationForProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const { baseInput, hurdlePct, platformProfile, capexDataMissing } = await this.buildReturnsEngineInput(project, user.organizationId);
    const hasPlatformProfile = Boolean(platformProfile);
    const baseResult = computeReturnsEngine(baseInput);
    const eligibility = computeEligibility(
      baseInput.sourcesUses.collecteMontant > 0 ? baseResult.securedNetYieldPct : null,
      hasPlatformProfile ? hurdlePct : null,
    );
    const stressScenarios = computeAllStressScenarios(baseInput, hurdlePct, hasPlatformProfile);
    const combinedSevere = stressScenarios.find((s) => s.scenario === 'COMBINED_SEVERE');
    const breakDownside = computeBreakEventScenario(baseInput, 'TENANT_BREAK_DOWNSIDE', hurdlePct, hasPlatformProfile);
    const dataConfidence = await this.dataProvenance.getDataConfidenceForProject(projectId, user);
    const { profile: esgProfile } = await this.esgRisk.getProfile(projectId, user);
    const budgetedCapexTotal = Object.values(baseInput.capexByYear ?? {}).reduce((sum, v) => sum + v, 0);
    const feeDataMissing = project.stakeholders.every((s) => s.feeDefinitions.length === 0);

    return computeICRecommendation({
      sourcesUsesBalanced: baseResult.sourcesUsesResult.balanced,
      hasPlatformProfile: Boolean(platformProfile),
      hasLeases: project.leases.length > 0,
      leaseAssessments: baseResult.leaseSecurity.assessments,
      eligibility,
      combinedSevereScenario: combinedSevere,
      breakDownsideScenario: breakDownside,
      capexDataMissing,
      dataConfidencePct: dataConfidence.scorePct,
      esgCapexToComplyTotal: esgProfile.capexToComplyTotal,
      budgetedCapexTotal,
      feeDataMissing,
    });
  }

  async createICDecision(projectId: string, dto: CreateICDecisionDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    const existing = await this.prisma.fractionalICDecision.findFirst({ where: { projectId }, orderBy: { version: 'desc' } });
    return this.prisma.fractionalICDecision.create({
      data: {
        projectId,
        status: dto.status,
        hardStops: dto.hardStops ?? [],
        conditions: dto.conditions ?? [],
        watchItems: dto.watchItems ?? [],
        recommendation: dto.recommendation,
        version: (existing?.version ?? 0) + 1,
        decidedById: user.id,
      },
    });
  }

  // ── Investment Memory — Actuals, Outcome, Performance Attribution (§20) ─

  async createProjectActual(projectId: string, dto: CreateProjectActualDto, user: AuthenticatedUser) {
    await this.findOne(projectId, user);
    return this.prisma.fractionalProjectActual.create({ data: { projectId, ...dto } });
  }

  /**
   * Un résultat final (Succès/Perte/...) n'a de sens que si la sortie est
   * effectivement intervenue — jamais une conclusion enregistrée par anti-
   * cipation ou par défaut sur un dossier encore en vie (spec Cockpit/
   * Fractionné P0 : le front n'impose plus SUCCES comme valeur initiale,
   * ce garde-fou empêche l'écriture même si l'appel API est forgé).
   */
  async upsertProjectOutcome(projectId: string, dto: UpsertProjectOutcomeDto, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    if (project.status !== 'SORTIE') {
      throw new BadRequestException('Le résultat final ne peut être enregistré que pour un dossier en statut SORTIE.');
    }
    const data = { ...dto, exitDate: dto.exitDate ? new Date(dto.exitDate) : undefined };
    return this.prisma.fractionalProjectOutcome.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: data,
    });
  }

  /**
   * Compare chaque FractionalProjectActual au Business Plan initial pour
   * l'année correspondante (offset identique à celui utilisé pour
   * capexByYear dans buildReturnsEngineInput). `period` doit être une année
   * simple ("2027") pour être rapprochée du BP — sinon l'attribution est
   * calculée avec des valeurs BP nulles (0), non bloquant mais moins utile.
   */
  async computePerformanceAttributionForProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.findOne(projectId, user);
    const { baseInput } = await this.buildReturnsEngineInput(project, user.organizationId);
    const baseResult = computeReturnsEngine(baseInput);

    return project.actuals.map((actual) => {
      const periodYear = Number(actual.period);
      const offset = Number.isFinite(periodYear) ? yearOffsetFromAsOfDate(periodYear, baseInput.asOfDate) : null;
      const bpYear = offset !== null ? baseResult.yearlyModel.find((y) => y.year === offset) : undefined;
      const capexBp = offset !== null ? (baseInput.capexByYear?.[offset] ?? 0) : 0;

      const attribution = computePerformanceAttribution({
        loyersReels: actual.loyersReels !== null ? Number(actual.loyersReels) : null,
        opexReel: actual.opexReel !== null ? Number(actual.opexReel) : null,
        capexReel: actual.capexReel !== null ? Number(actual.capexReel) : null,
        distributionsReelles: actual.distributionsReelles !== null ? Number(actual.distributionsReelles) : null,
        loyerBp: bpYear?.grossPotentialRent ?? 0,
        opexBp: bpYear?.operatingExpenses ?? 0,
        capexBp,
        distributionBp: bpYear?.investorDistribution ?? 0,
      });

      return { period: actual.period, ...attribution };
    });
  }

  // ── Comparable Project Engine (spec §20.2) ──────────────────

  async listComparables(projectId: string, user: AuthenticatedUser) {
    const target = await this.findOne(projectId, user);
    const others = await this.prisma.fractionalProject.findMany({
      where: { organizationId: user.organizationId, id: { not: projectId } },
      include: { sourcesUses: true, leases: true },
    });

    const toFeatures = (p: { id: string; name: string; city: string | null; status: string; sourcesUses: { prixNetVendeur: unknown } | null; leases: { loyerFacialAnnuel: unknown }[] }): ComparableFeatures => {
      const prixNetVendeur = p.sourcesUses ? Number(p.sourcesUses.prixNetVendeur) : null;
      const totalLoyer = p.leases.reduce((sum, l) => sum + Number(l.loyerFacialAnnuel), 0);
      const grossYieldPct = prixNetVendeur && prixNetVendeur > 0 ? (totalLoyer / prixNetVendeur) * 100 : null;
      return { projectId: p.id, name: p.name, city: p.city, status: p.status, prixNetVendeur, grossYieldPct };
    };

    return findComparables(toFeatures(target), others.map(toFeatures));
  }
}
