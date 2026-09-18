import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_URL } from '@/lib/api';
import type {
  PrequalificationCase,
  PrequalificationCaseDetail,
  PrequalificationProjectType,
  PrequalificationOrientation,
  PrequalPerson,
  PrequalCompany,
  PrequalProjectProfile,
  PrequalFinancialModel,
  PrequalSalesLot,
  PrequalLotStatus,
  PrequalTimelineAssessment,
  PrequalDocument,
  Finding,
  FindingCategory,
  FindingSeverity,
  FindingReviewStatus,
  PrequalDecisiveQuestion,
  PrequalDocumentRequest,
  PrequalEvidence,
  EvidenceStatus,
  PrequalPromotionResult,
  PrequalExtractionResult,
  PrequalExposureSummary,
  PrequalVersionSummary,
  PrequalVersionDiff,
  PrequalBpComparison,
  PrequalDataRoomSuggestion,
  PrequalMarketStudy,
  PrequalStressScenario,
} from '@/types';

function invalidateCase(qc: ReturnType<typeof useQueryClient>, caseId: string) {
  qc.invalidateQueries({ queryKey: ['prequalification', 'cases', caseId] });
}

export function usePrequalificationCases(filters: { status?: string; assignedAnalystId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assignedAnalystId) params.set('assignedAnalystId', filters.assignedAnalystId);
  const qs = params.toString();
  return useQuery({
    queryKey: ['prequalification', 'cases', 'list', filters],
    queryFn: () => api.get<PrequalificationCase[]>(`/prequalification/cases${qs ? `?${qs}` : ''}`),
  });
}

export function usePrequalificationCase(id: string | null) {
  return useQuery({
    queryKey: ['prequalification', 'cases', id],
    queryFn: () => api.get<PrequalificationCaseDetail>(`/prequalification/cases/${id}`),
    enabled: Boolean(id),
  });
}

export interface CreateCasePayload {
  name: string;
  entryChannel?: string;
  introducer?: string;
  assignedAnalystId?: string;
  projectType?: PrequalificationProjectType;
  analystImpressionNote?: string;
}

export function useCreatePrequalificationCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCasePayload) => api.post<PrequalificationCase>('/prequalification/cases', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prequalification', 'cases', 'list'] }),
  });
}

export function useUpdatePrequalificationCase(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateCasePayload>) => api.patch<PrequalificationCase>(`/prequalification/cases/${caseId}`, payload),
    onSuccess: () => {
      invalidateCase(qc, caseId);
      qc.invalidateQueries({ queryKey: ['prequalification', 'cases', 'list'] });
    },
  });
}

export function useUpsertProjectProfile(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PrequalProjectProfile>) => api.patch<PrequalProjectProfile>(`/prequalification/cases/${caseId}/project`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useUpsertFinancialModel(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Omit<PrequalFinancialModel, 'costLineItems'>> & { costLineItems?: { category: string; label: string; amount: number }[] }) =>
      api.patch<PrequalFinancialModel>(`/prequalification/cases/${caseId}/financial`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useUpsertTimeline(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PrequalTimelineAssessment>) => api.patch<PrequalTimelineAssessment>(`/prequalification/cases/${caseId}/timeline`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

// ── Porteurs ──

export function useCreatePerson(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PrequalPerson> & { fullName: string; role: string }) => api.post<PrequalPerson>(`/prequalification/cases/${caseId}/people`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useUpdatePerson(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, ...payload }: Partial<PrequalPerson> & { personId: string; fullName: string; role: string }) =>
      api.patch<PrequalPerson>(`/prequalification/cases/${caseId}/people/${personId}`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useDeletePerson(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) => api.delete(`/prequalification/cases/${caseId}/people/${personId}`),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

// ── Sociétés ──

export function useCreateCompany(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PrequalCompany> & { legalName: string; role: string }) => api.post<PrequalCompany>(`/prequalification/cases/${caseId}/companies`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useUpdateCompany(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, ...payload }: Partial<PrequalCompany> & { companyId: string; legalName: string; role: string }) =>
      api.patch<PrequalCompany>(`/prequalification/cases/${caseId}/companies/${companyId}`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useDeleteCompany(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => api.delete(`/prequalification/cases/${caseId}/companies/${companyId}`),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

// ── Lots ──

export interface LotPayload {
  label: string;
  assetType?: string;
  surfaceSqm?: number;
  askingPrice?: number;
  expectedPrice?: number;
  status?: PrequalLotStatus;
  buyerFinancingStatus?: string;
}

export function useCreateLot(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LotPayload) => api.post<PrequalSalesLot>(`/prequalification/cases/${caseId}/lots`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useUpdateLot(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lotId, ...payload }: LotPayload & { lotId: string }) => api.patch<PrequalSalesLot>(`/prequalification/cases/${caseId}/lots/${lotId}`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useDeleteLot(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lotId: string) => api.delete(`/prequalification/cases/${caseId}/lots/${lotId}`),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

// ── Findings ──

export function useCreateFinding(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { category: FindingCategory; severity: FindingSeverity; statement: string; rationale: string }) =>
      api.post<Finding>(`/prequalification/cases/${caseId}/findings`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useReviewFinding(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ findingId, reviewStatus }: { findingId: string; reviewStatus: FindingReviewStatus }) =>
      api.patch<Finding>(`/prequalification/cases/${caseId}/findings/${findingId}/review`, { reviewStatus }),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

// ── Questions décisives ──

export function useCreateDecisiveQuestion(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { question: string; reason: string; answerCouldChangeOrientation: boolean; priority: string }) =>
      api.post<PrequalDecisiveQuestion>(`/prequalification/cases/${caseId}/questions`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useAnswerDecisiveQuestion(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      api.patch<PrequalDecisiveQuestion>(`/prequalification/cases/${caseId}/questions/${questionId}/answer`, { answer }),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

// ── Demandes de documents ──

export function useCreateDocumentRequest(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { label: string; block: string }) => api.post<PrequalDocumentRequest>(`/prequalification/cases/${caseId}/document-requests`, payload),
    onSuccess: () => {
      invalidateCase(qc, caseId);
      qc.invalidateQueries({ queryKey: ['prequalification', 'cases', caseId, 'data-room-suggestions'] });
    },
  });
}

export function useUpdateDocumentRequest(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...payload }: { requestId: string; status?: string; linkedDocumentId?: string }) =>
      api.patch<PrequalDocumentRequest>(`/prequalification/cases/${caseId}/document-requests/${requestId}`, payload),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

// ── Documents ──

export function useUploadPrequalDocument(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<PrequalDocument>(`/prequalification/cases/${caseId}/documents`, form);
    },
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useDeletePrequalDocument(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.delete(`/prequalification/cases/${caseId}/documents/${documentId}`),
    onSuccess: () => invalidateCase(qc, caseId),
  });
}

export function useDownloadPrequalDocument(caseId: string) {
  return useMutation({
    mutationFn: async (doc: PrequalDocument) => {
      const { url } = await api.get<{ url: string }>(`/prequalification/cases/${caseId}/documents/${doc.id}/url`);
      const blob = await api.getBlob(url);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = doc.name;
      link.click();
      URL.revokeObjectURL(objectUrl);
    },
  });
}

/**
 * Export pré-comité en PDF (spec "vraie correction" — `window.print()` ne
 * fonctionne quasiment jamais sur Chrome Android, limitation du navigateur
 * ; le PDF est donc généré côté serveur et téléchargé comme un fichier via
 * ce même mécanisme blob qu'utilise déjà useDownloadPrequalDocument,
 * fonctionne identiquement sur desktop et mobile, tous navigateurs).
 */
export function useExportPrequalPdf(caseId: string) {
  return useMutation({
    mutationFn: async (caseName: string) => {
      const blob = await api.getBlob(`${API_URL}/prequalification/cases/${caseId}/export-pdf`);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `prequalification-${caseName}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    },
  });
}

/** Extraction assistée par IA — suggestion en lecture seule, l'analyste applique chaque champ explicitement. */
export function useExtractPrequalDocument(caseId: string) {
  return useMutation({
    mutationFn: (documentId: string) => api.post<PrequalExtractionResult>(`/prequalification/cases/${caseId}/documents/${documentId}/extract`),
  });
}

// ── Evidence (provenance) ──

export function usePrequalEvidence(caseId: string) {
  return useQuery({
    queryKey: ['prequalification', 'cases', caseId, 'evidence'],
    queryFn: () => api.get<PrequalEvidence[]>(`/prequalification/cases/${caseId}/evidence`),
    enabled: Boolean(caseId),
  });
}

export function useUpsertEvidence(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      fieldKey,
      ...payload
    }: {
      entityType: string;
      entityId: string;
      fieldKey: string;
      status: EvidenceStatus;
      sourceDocumentId?: string;
      sourcePage?: number;
      note?: string;
    }) => api.put<PrequalEvidence>(`/prequalification/cases/${caseId}/evidence/${entityType}/${entityId}/${fieldKey}`, payload),
    onSuccess: () => {
      invalidateCase(qc, caseId);
      qc.invalidateQueries({ queryKey: ['prequalification', 'cases', caseId, 'evidence'] });
    },
  });
}

// ── Validation / promotion ──

export function useValidateAndPromote(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { expectedVersion: number; orientation: PrequalificationOrientation; decisionComment: string }) =>
      api.post<PrequalPromotionResult>(`/prequalification/cases/${caseId}/validate`, payload),
    onSuccess: () => {
      invalidateCase(qc, caseId);
      qc.invalidateQueries({ queryKey: ['prequalification', 'cases', 'list'] });
    },
  });
}

// ── P1 ──

export function usePrequalExposure(caseId: string) {
  return useQuery({
    queryKey: ['prequalification', 'cases', caseId, 'exposure'],
    queryFn: () => api.get<PrequalExposureSummary>(`/prequalification/cases/${caseId}/exposure`),
    enabled: Boolean(caseId),
  });
}

export function usePrequalVersions(caseId: string) {
  return useQuery({
    queryKey: ['prequalification', 'cases', caseId, 'versions'],
    queryFn: () => api.get<PrequalVersionSummary[]>(`/prequalification/cases/${caseId}/versions`),
    enabled: Boolean(caseId),
  });
}

export function usePrequalVersionCompare(caseId: string, versionA: number | null, versionB: number | null) {
  return useQuery({
    queryKey: ['prequalification', 'cases', caseId, 'versions', 'compare', versionA, versionB],
    queryFn: () => api.get<PrequalVersionDiff>(`/prequalification/cases/${caseId}/versions/compare?a=${versionA}&b=${versionB}`),
    enabled: Boolean(caseId) && versionA != null && versionB != null && versionA !== versionB,
  });
}

export function usePrequalBpComparison(caseId: string) {
  return useQuery({
    queryKey: ['prequalification', 'cases', caseId, 'financial', 'bp-comparison'],
    queryFn: () => api.get<PrequalBpComparison>(`/prequalification/cases/${caseId}/financial/bp-comparison`),
    enabled: Boolean(caseId),
  });
}

export function usePrequalMarketStudy(caseId: string) {
  return useQuery({
    queryKey: ['prequalification', 'cases', caseId, 'market-study'],
    // Nest renvoie un corps vide (pas le littéral JSON "null") pour un contrôleur qui retourne
    // null — api.get() le résout donc en `undefined`, que react-query refuse comme valeur de
    // query (throw "Query data cannot be undefined"). Normalisé explicitement en `null`.
    queryFn: () => api.get<PrequalMarketStudy | null>(`/prequalification/cases/${caseId}/market-study`).then((result) => result ?? null),
    enabled: Boolean(caseId),
  });
}

export function usePrequalStressTests(caseId: string) {
  return useQuery({
    queryKey: ['prequalification', 'cases', caseId, 'stress-tests'],
    queryFn: () => api.get<PrequalStressScenario[]>(`/prequalification/cases/${caseId}/stress-tests`),
    enabled: Boolean(caseId),
  });
}

export function usePrequalDataRoomSuggestions(caseId: string) {
  return useQuery({
    queryKey: ['prequalification', 'cases', caseId, 'data-room-suggestions'],
    queryFn: () => api.get<PrequalDataRoomSuggestion[]>(`/prequalification/cases/${caseId}/data-room-suggestions`),
    enabled: Boolean(caseId),
  });
}

export function usePrequalLockBaseline(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>(`/prequalification/cases/${caseId}/financial/lock-baseline`, {}),
    onSuccess: () => {
      invalidateCase(qc, caseId);
      qc.invalidateQueries({ queryKey: ['prequalification', 'cases', caseId, 'financial', 'bp-comparison'] });
    },
  });
}
