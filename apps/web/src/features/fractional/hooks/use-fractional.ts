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
  franchiseMois?: number;
  chargesRecuperables?: boolean;
  depotGarantieMontant?: number;
  statutRenouvellement?: FractionalLeaseRenewalStatus;
  restrictionsCessionSousLocation?: string;
  repartitionTravaux?: string;
  impayesNotes?: string;
  notes?: string;
}

export function useCreateLease(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LeasePayload) => api.post(`/fractional/projects/${projectId}/leases`, payload),
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
