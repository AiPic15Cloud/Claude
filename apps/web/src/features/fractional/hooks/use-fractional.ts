import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  FractionalProject,
  FractionalProjectDetail,
  FractionalSynthese,
  FractionalProjectStatus,
  FractionalIndexationType,
  FractionalLeaseRenewalStatus,
  FractionalCapexResponsable,
  FractionalValuationMethod,
  FractionalVehicleInstrumentType,
  FractionalAssumptionScenario,
  PlatformFractionalProfile,
  FractionalDealEconomics,
  DealEconomicsScenarioResult,
  FractionalStakeholder,
  FractionalFeeDefinition,
  FractionalWaterfallTier,
  StakeholderRole,
  FeeType,
  FeeCalculationBase,
  WaterfallTierType,
  StressScenarioResult,
  ICRecommendation,
  ICDecisionStatus,
  FractionalICDecision,
  FractionalProjectActual,
  FractionalProjectOutcome,
  ProjectOutcomeStatus,
  PerformanceAttributionResult,
  ComparableResult,
  LeaseLegalReview,
  RentIndexSeries,
  RentIndexType,
  MarketComparablePool,
  MarketComparableType,
  FractionalScoreCategory,
  FractionalEliminatoryRule,
  FractionalBareme,
  FractionalScoreAssessment,
  SubmitScoreAssessmentResponse,
  EliminatoryMetricKey,
  EliminatoryComparisonOperator,
  FractionalDataProvenance,
  DataConfidenceResult,
  ProvenanceSourceLevel,
  ProvenanceVerificationStatus,
  ProvenanceConfidence,
  TvaRegime,
  CapRateBuildUpResponse,
  PortfolioReversionResult,
} from '@/types';

export function useFractionalProjects() {
  return useQuery({
    queryKey: ['fractional', 'projects'],
    queryFn: () => api.get<FractionalProject[]>('/fractional/projects'),
  });
}

export function useFractionalProject(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id],
    queryFn: () => api.get<FractionalProjectDetail>(`/fractional/projects/${id}`),
    enabled: Boolean(id),
  });
}

export function useFractionalSynthese(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id, 'synthese'],
    queryFn: () => api.get<FractionalSynthese>(`/fractional/projects/${id}/synthese`),
    enabled: Boolean(id),
  });
}

export function usePlatformProfiles() {
  return useQuery({
    queryKey: ['fractional', 'platform-profiles'],
    queryFn: () => api.get<PlatformFractionalProfile[]>('/fractional/projects/platform-profiles/all'),
  });
}

export interface CreateFractionalProjectPayload {
  name: string;
  reference: string;
  groupKey?: string;
  perimeterLabel?: string;
  address?: string;
  city?: string;
  postcode?: string;
  notes?: string;
}

export function useCreateFractionalProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFractionalProjectPayload) => api.post<FractionalProject>('/fractional/projects', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fractional', 'projects'] }),
  });
}

export function useUpdateFractionalProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FractionalProjectStatus }) => api.patch<FractionalProject>(`/fractional/projects/${id}`, { status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['fractional', 'projects'] });
      qc.invalidateQueries({ queryKey: ['fractional', 'projects', vars.id] });
    },
  });
}

export interface SourcesUsesPayload {
  prixNetVendeur: number;
  droitsNotaire?: number;
  honoraires?: number;
  travauxInitiaux?: number;
  capexDiffereReserve?: number;
  fraisPlateformeEntree?: number;
  reserveVacance?: number;
  reserveTravaux?: number;
  reserveTresorerie?: number;
  collecteMontant?: number;
  sponsorEquity?: number;
  detteEventuelle?: number;
  autresSources?: number;
  regimeTva?: TvaRegime;
  tvaTauxPct?: number;
  tvaRecuperationDelaiMois?: number;
}

function invalidateProject(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: ['fractional', 'projects', id] });
  qc.invalidateQueries({ queryKey: ['fractional', 'projects', id, 'synthese'] });
}

export function useUpsertSourcesUses(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SourcesUsesPayload) => api.post(`/fractional/projects/${projectId}/sources-uses`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export interface LeasePayload {
  tenantName: string;
  lotLabel?: string;
  surfaceM2?: number;
  dateEffet: string;
  dateTerme: string;
  breakDates?: string[];
  loyerFacialAnnuel: number;
  ervAnnuel?: number;
  indexation?: FractionalIndexationType;
  indexationCapPct?: number;
  indexationFloorPct?: number;
  franchiseMois?: number;
  chargesRecuperables?: boolean;
  depotGarantieMontant?: number;
  statutRenouvellement?: FractionalLeaseRenewalStatus;
  restrictionsCessionSousLocation?: string;
  repartitionTravaux?: string;
  impayesNotes?: string;
  notes?: string;
  sirenLocataire?: string;
  procedureCollective?: boolean;
  garantieMaisonMere?: boolean;
  caLocataireAnnuel?: number;
  ebitdaLocataireAnnuel?: number;
  tresorerieLocataire?: number;
  exerciceFinancierAsOf?: string;
}

export function useCreateLease(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LeasePayload) => api.post(`/fractional/projects/${projectId}/leases`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useUpdateLease(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, payload }: { leaseId: string; payload: Partial<LeasePayload> }) =>
      api.patch(`/fractional/projects/${projectId}/leases/${leaseId}`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useDeleteLease(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leaseId: string) => api.delete(`/fractional/projects/${projectId}/leases/${leaseId}`),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export interface CapexItemPayload {
  annee: number;
  montant: number;
  nature: string;
  responsable?: FractionalCapexResponsable;
  notes?: string;
}

export function useCreateCapexItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CapexItemPayload) => api.post(`/fractional/projects/${projectId}/capex-items`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useUpdateCapexItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ capexItemId, payload }: { capexItemId: string; payload: Partial<CapexItemPayload> }) =>
      api.patch(`/fractional/projects/${projectId}/capex-items/${capexItemId}`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useDeleteCapexItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (capexItemId: string) => api.delete(`/fractional/projects/${projectId}/capex-items/${capexItemId}`),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export interface ValuationPayload {
  method: FractionalValuationMethod;
  value: number;
  capRatePct?: number;
  asOfDate: string;
  source?: string;
  notes?: string;
}

export function useCreateValuation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ValuationPayload) => api.post(`/fractional/projects/${projectId}/valuations`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useUpdateValuation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ valuationId, payload }: { valuationId: string; payload: Partial<ValuationPayload> }) =>
      api.patch(`/fractional/projects/${projectId}/valuations/${valuationId}`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useDeleteValuation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (valuationId: string) => api.delete(`/fractional/projects/${projectId}/valuations/${valuationId}`),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export interface VehicleStructurePayload {
  platformProfileId?: string;
  spvName?: string;
  instrumentType?: FractionalVehicleInstrumentType;
  nominal?: number;
  maturity?: string;
  amortization?: string;
  governanceNotes?: string;
}

export function useUpsertVehicleStructure(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VehicleStructurePayload) => api.post(`/fractional/projects/${projectId}/vehicle-structure`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export interface AssumptionSetPayload {
  scenario: FractionalAssumptionScenario;
  label?: string;
  values: Record<string, unknown>;
}

export function useUpsertAssumptionSet(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssumptionSetPayload) => api.post(`/fractional/projects/${projectId}/assumption-sets`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export interface CreatePlatformProfilePayload {
  platformName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  minNetInvestorYieldPct: number;
  targetHoldPeriodMonths?: number;
  eligibleLocations?: string;
  strategyConstraints?: string;
  acquisitionFeePct?: number;
  annualManagementFeePct?: number;
  incomeShareInvestorPct: number;
  capitalGainShareInvestorPct: number;
  appraisalRule?: string;
  earlyExitRule?: string;
  source?: string;
  confidence?: string;
}

export function useCreatePlatformProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlatformProfilePayload) => api.post<PlatformFractionalProfile>('/fractional/projects/platform-profiles', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fractional', 'platform-profiles'] }),
  });
}

// ── Deal Economics & Stakeholder Waterfall (spec V3.1 §29) ─────────────────

export function useFractionalDealEconomics(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id, 'deal-economics'],
    queryFn: () => api.get<FractionalDealEconomics | null>(`/fractional/projects/${id}/deal-economics`),
    enabled: Boolean(id),
  });
}

export function useFractionalDealEconomicsStressTests(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id, 'deal-economics-stress-tests'],
    queryFn: () => api.get<DealEconomicsScenarioResult[] | null>(`/fractional/projects/${id}/deal-economics-stress-tests`),
    enabled: Boolean(id),
  });
}

function invalidateDealEconomics(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: ['fractional', 'projects', id] });
  qc.invalidateQueries({ queryKey: ['fractional', 'projects', id, 'deal-economics'] });
}

export interface StakeholderPayload {
  role: StakeholderRole;
  name: string;
  capitalEngaged?: number;
  notes?: string;
}

export function useCreateStakeholder(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StakeholderPayload) => api.post<FractionalStakeholder>(`/fractional/projects/${projectId}/stakeholders`, payload),
    onSuccess: () => invalidateDealEconomics(qc, projectId),
  });
}

export function useDeleteStakeholder(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stakeholderId: string) => api.delete(`/fractional/projects/${projectId}/stakeholders/${stakeholderId}`),
    onSuccess: () => invalidateDealEconomics(qc, projectId),
  });
}

export interface FeeDefinitionPayload {
  stakeholderId: string;
  feeType: FeeType;
  ratePct?: number;
  fixedAmount?: number;
  calculationBase?: FeeCalculationBase;
}

export function useCreateFeeDefinition(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeeDefinitionPayload) => api.post<FractionalFeeDefinition>(`/fractional/projects/${projectId}/fee-definitions`, payload),
    onSuccess: () => invalidateDealEconomics(qc, projectId),
  });
}

export function useDeleteFeeDefinition(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (feeId: string) => api.delete(`/fractional/projects/${projectId}/fee-definitions/${feeId}`),
    onSuccess: () => invalidateDealEconomics(qc, projectId),
  });
}

export interface WaterfallTierPayload {
  order: number;
  type: WaterfallTierType;
  beneficiaryStakeholderId?: string;
  hurdleRatePct?: number;
  catchUpPct?: number;
  sharePct?: number;
}

export function useCreateWaterfallTier(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WaterfallTierPayload) => api.post<FractionalWaterfallTier>(`/fractional/projects/${projectId}/waterfall-tiers`, payload),
    onSuccess: () => invalidateDealEconomics(qc, projectId),
  });
}

export function useDeleteWaterfallTier(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tierId: string) => api.delete(`/fractional/projects/${projectId}/waterfall-tiers/${tierId}`),
    onSuccess: () => invalidateDealEconomics(qc, projectId),
  });
}

// ── P1 — Stress Testing, IC Engine, Investment Memory, Comparables ─────────

export function useFractionalStressTests(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id, 'stress-tests'],
    queryFn: () => api.get<StressScenarioResult[]>(`/fractional/projects/${id}/stress-tests`),
    enabled: Boolean(id),
  });
}

export function useFractionalICRecommendation(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id, 'ic-recommendation'],
    queryFn: () => api.get<ICRecommendation>(`/fractional/projects/${id}/ic-recommendation`),
    enabled: Boolean(id),
  });
}

export interface ICDecisionPayload {
  status: ICDecisionStatus;
  hardStops?: string[];
  conditions?: string[];
  watchItems?: string[];
  recommendation?: string;
}

export function useCreateICDecision(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ICDecisionPayload) => api.post<FractionalICDecision>(`/fractional/projects/${projectId}/ic-decisions`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export interface ProjectActualPayload {
  period: string;
  loyersReels?: number;
  occupationPct?: number;
  opexReel?: number;
  capexReel?: number;
  distributionsReelles?: number;
  valorisationReelle?: number;
  notes?: string;
}

export function useCreateProjectActual(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectActualPayload) => api.post<FractionalProjectActual>(`/fractional/projects/${projectId}/actuals`, payload),
    onSuccess: () => {
      invalidateProject(qc, projectId);
      qc.invalidateQueries({ queryKey: ['fractional', 'projects', projectId, 'performance-attribution'] });
    },
  });
}

export interface ProjectOutcomePayload {
  status: ProjectOutcomeStatus;
  triRealise?: number;
  multipleRealise?: number;
  notes?: string;
}

export function useUpsertProjectOutcome(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectOutcomePayload) => api.post<FractionalProjectOutcome>(`/fractional/projects/${projectId}/outcome`, payload),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useFractionalPerformanceAttribution(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id, 'performance-attribution'],
    queryFn: () => api.get<PerformanceAttributionResult[]>(`/fractional/projects/${id}/performance-attribution`),
    enabled: Boolean(id),
  });
}

export function useFractionalComparables(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id, 'comparables'],
    queryFn: () => api.get<ComparableResult[]>(`/fractional/projects/${id}/comparables`),
    enabled: Boolean(id),
  });
}

export function useFractionalLegalReview(id: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', id, 'legal-review'],
    queryFn: () => api.get<LeaseLegalReview[]>(`/fractional/projects/${id}/legal-review`),
    enabled: Boolean(id),
  });
}

// ── Marché — RentIndexSeries & MarketComparablePool (patch V3.2 §2) ────────

export function useRentIndexSeries() {
  return useQuery({
    queryKey: ['fractional', 'market-data', 'rent-index-series'],
    queryFn: () => api.get<RentIndexSeries[]>('/fractional/market-data/rent-index-series'),
  });
}

export interface RentIndexSeriesPayload {
  indexType: RentIndexType;
  period: string;
  value: number;
  cagr5y?: number;
  cagr10y?: number;
  asOfDate: string;
  source?: string;
}

export function useUpsertRentIndexSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RentIndexSeriesPayload) => api.post<RentIndexSeries>('/fractional/market-data/rent-index-series', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fractional', 'market-data', 'rent-index-series'] }),
  });
}

export function useDeleteRentIndexSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fractional/market-data/rent-index-series/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fractional', 'market-data', 'rent-index-series'] }),
  });
}

export function useMarketComparables(commune?: string) {
  return useQuery({
    queryKey: ['fractional', 'market-data', 'comparables', commune ?? null],
    queryFn: () => api.get<MarketComparablePool[]>(`/fractional/market-data/comparables${commune ? `?commune=${encodeURIComponent(commune)}` : ''}`),
  });
}

export interface MarketComparablePayload {
  commune: string;
  secteur?: string;
  type: MarketComparableType;
  valeurM2?: number;
  yieldPct?: number;
  surfaceM2?: number;
  asOfDate: string;
  source: string;
  notes?: string;
  addedByProjectId?: string;
}

export function useCreateMarketComparable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MarketComparablePayload) => api.post<MarketComparablePool>('/fractional/market-data/comparables', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fractional', 'market-data', 'comparables'] }),
  });
}

export function useDeleteMarketComparable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fractional/market-data/comparables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fractional', 'market-data', 'comparables'] }),
  });
}

// ── Scoring pondéré + règles éliminatoires nommées (Complément H, points 1/8) ──
// Barème et règles éliminatoires PARTAGÉS au niveau organisation (comme
// RentIndexSeries/MarketComparablePool ci-dessus) — jamais ressaisis par
// dossier ; seul le FractionalScoreAssessment est propre à un projet.

export function useFractionalBareme(projectId: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', projectId, 'fit-scoring', 'bareme'],
    queryFn: () => api.get<FractionalBareme>(`/fractional/fit-scoring/projects/${projectId}/bareme`),
    enabled: Boolean(projectId),
  });
}

export function useFractionalLatestAssessment(projectId: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', projectId, 'fit-scoring', 'assessments', 'latest'],
    // Coalesce explicitement à null : un dossier jamais noté renvoie un body vide (204),
    // qu'api.get() traduit en `undefined` — react-query refuse une query qui résout à
    // `undefined` (cf. son propre avertissement), jamais un état "pas encore noté".
    queryFn: async () => (await api.get<FractionalScoreAssessment | null>(`/fractional/fit-scoring/projects/${projectId}/assessments/latest`)) ?? null,
    enabled: Boolean(projectId),
  });
}

export function useSubmitScoreAssessment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers: { criterionId: string; bucketId: string }[]) =>
      api.post<SubmitScoreAssessmentResponse>(`/fractional/fit-scoring/projects/${projectId}/assessments`, { answers }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fractional', 'projects', projectId, 'fit-scoring', 'assessments', 'latest'] }),
  });
}

export function useFractionalScoreCategories(assetType?: string) {
  return useQuery({
    queryKey: ['fractional', 'fit-scoring', 'categories', assetType ?? null],
    queryFn: () => api.get<FractionalScoreCategory[]>(`/fractional/fit-scoring/categories${assetType ? `?assetType=${encodeURIComponent(assetType)}` : ''}`),
  });
}

export interface CreateScoreCategoryPayload {
  assetType?: string;
  label: string;
  maxPoints: number;
  sortOrder?: number;
}

export function useCreateScoreCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateScoreCategoryPayload) => api.post<FractionalScoreCategory>('/fractional/fit-scoring/categories', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'fit-scoring', 'categories'] });
      // Le barème résolu par projet (useFractionalBareme) vit sous une clé
      // distincte par projectId — invalidée ici par prédicat pour que
      // l'onglet Fit reflète immédiatement une édition du barème partagé.
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('bareme') });
    },
  });
}

export function useDeleteScoreCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fractional/fit-scoring/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'fit-scoring', 'categories'] });
      // Le barème résolu par projet (useFractionalBareme) vit sous une clé
      // distincte par projectId — invalidée ici par prédicat pour que
      // l'onglet Fit reflète immédiatement une édition du barème partagé.
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('bareme') });
    },
  });
}

export interface CreateScoreCriterionPayload {
  categoryId: string;
  label: string;
  sourceField?: string;
  sortOrder?: number;
}

export function useCreateScoreCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateScoreCriterionPayload) => api.post('/fractional/fit-scoring/criteria', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'fit-scoring', 'categories'] });
      // Le barème résolu par projet (useFractionalBareme) vit sous une clé
      // distincte par projectId — invalidée ici par prédicat pour que
      // l'onglet Fit reflète immédiatement une édition du barème partagé.
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('bareme') });
    },
  });
}

export function useDeleteScoreCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fractional/fit-scoring/criteria/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'fit-scoring', 'categories'] });
      // Le barème résolu par projet (useFractionalBareme) vit sous une clé
      // distincte par projectId — invalidée ici par prédicat pour que
      // l'onglet Fit reflète immédiatement une édition du barème partagé.
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('bareme') });
    },
  });
}

export interface CreateScoreBucketPayload {
  criterionId: string;
  label: string;
  points: number;
  isEliminatory?: boolean;
  sortOrder?: number;
}

export function useCreateScoreBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateScoreBucketPayload) => api.post('/fractional/fit-scoring/buckets', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'fit-scoring', 'categories'] });
      // Le barème résolu par projet (useFractionalBareme) vit sous une clé
      // distincte par projectId — invalidée ici par prédicat pour que
      // l'onglet Fit reflète immédiatement une édition du barème partagé.
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('bareme') });
    },
  });
}

export function useDeleteScoreBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fractional/fit-scoring/buckets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'fit-scoring', 'categories'] });
      // Le barème résolu par projet (useFractionalBareme) vit sous une clé
      // distincte par projectId — invalidée ici par prédicat pour que
      // l'onglet Fit reflète immédiatement une édition du barème partagé.
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('bareme') });
    },
  });
}

export function useFractionalEliminatoryRules(assetType?: string) {
  return useQuery({
    queryKey: ['fractional', 'fit-scoring', 'eliminatory-rules', assetType ?? null],
    queryFn: () =>
      api.get<FractionalEliminatoryRule[]>(`/fractional/fit-scoring/eliminatory-rules${assetType ? `?assetType=${encodeURIComponent(assetType)}` : ''}`),
  });
}

export interface CreateEliminatoryRulePayload {
  assetType?: string;
  platformProfileId?: string;
  label: string;
  metricKey: EliminatoryMetricKey;
  operator: EliminatoryComparisonOperator;
  threshold: number;
  failMessage: string;
  sortOrder?: number;
}

export function useCreateEliminatoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEliminatoryRulePayload) => api.post<FractionalEliminatoryRule>('/fractional/fit-scoring/eliminatory-rules', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'fit-scoring', 'eliminatory-rules'] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('bareme') });
    },
  });
}

export function useDeleteEliminatoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fractional/fit-scoring/eliminatory-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'fit-scoring', 'eliminatory-rules'] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('bareme') });
    },
  });
}

// ── Data Integrity Engine — provenance généralisée (V3.1 §3, V2 §3) ────────

export function useFractionalProvenance(entityType: string, entityId: string | null) {
  return useQuery({
    queryKey: ['fractional', 'data-provenance', entityType, entityId],
    queryFn: () => api.get<FractionalDataProvenance[]>(`/fractional/data-provenance/${entityType}/${entityId}`),
    enabled: Boolean(entityId),
  });
}

export interface UpsertProvenancePayload {
  sourceLevel: ProvenanceSourceLevel;
  sourceReference?: string;
  asOfDate?: string;
  verificationStatus: ProvenanceVerificationStatus;
  confidence: ProvenanceConfidence;
  isOverride?: boolean;
  overrideJustification?: string;
}

export function useUpsertProvenance(entityType: string, entityId: string, fieldKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertProvenancePayload) => api.put<FractionalDataProvenance>(`/fractional/data-provenance/${entityType}/${entityId}/${fieldKey}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fractional', 'data-provenance', entityType, entityId] });
      qc.invalidateQueries({ queryKey: ['fractional', 'data-provenance', 'confidence'] });
    },
  });
}

export function useFractionalDataConfidence(projectId: string | null) {
  return useQuery({
    queryKey: ['fractional', 'data-provenance', 'confidence', projectId],
    queryFn: () => api.get<DataConfidenceResult>(`/fractional/data-provenance/projects/${projectId}/confidence`),
    enabled: Boolean(projectId),
  });
}

// ── Cap Rate Build-Up (Complément H, H.3) ───────────────────────────────────

export function useFractionalCapRateBuildUp(projectId: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', projectId, 'cap-rate-build-up'],
    queryFn: () => api.get<CapRateBuildUpResponse>(`/fractional/projects/${projectId}/cap-rate-build-up`),
    enabled: Boolean(projectId),
  });
}

export function useFractionalRentalReversion(projectId: string | null) {
  return useQuery({
    queryKey: ['fractional', 'projects', projectId, 'rental-reversion'],
    queryFn: () => api.get<PortfolioReversionResult>(`/fractional/projects/${projectId}/rental-reversion`),
    enabled: Boolean(projectId),
  });
}
