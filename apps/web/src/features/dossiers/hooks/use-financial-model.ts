import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BpComparison, FinancialModel } from '@/types';

export function useFinancialModel(dealId: string) {
  return useQuery({
    queryKey: ['financial-model', dealId],
    queryFn: () => api.get<FinancialModel>(`/deals/${dealId}/financial-model`),
  });
}

export function useBpComparison(dealId: string) {
  return useQuery({
    queryKey: ['financial-model', dealId, 'bp-comparison'],
    queryFn: () => api.get<BpComparison>(`/deals/${dealId}/financial-model/bp-comparison`),
  });
}

export interface FinancialAssumptionPayload {
  surfaceSqm: number;
  sellingPricePerSqm: number;
  targetMarginPct?: number;
  notes?: string;
  landPrice?: number;
  notaryFees?: number;
  diagnosticsCost?: number;
  insuranceCost?: number;
  propertyTaxCost?: number;
  surveyStudiesCost?: number;
  agencyFees?: number;
  referralFees?: number;
  bankMiscFees?: number;
  lpbFeesPctHT?: number;
  lpbTvaApplicable?: boolean;
  lpbTvaRatePct?: number;
  lpbDurationMinMonths?: number;
  lpbDurationMaxMonths?: number;
  latePenaltyApplied?: boolean;
  bankName?: string;
  bankLoanAcquisition?: number;
  bankLoanAccompagnement?: number;
  bankInterestRatePct?: number;
  bankFileFees?: number;
  bankGuaranteeFees?: number;
  /** Document du dossier qui justifie ces valeurs (ex. un BP analysé par l'IA) — tracé dans l'historique des valeurs. */
  sourceDocumentId?: string;
}

export function useSaveFinancialModel(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FinancialAssumptionPayload) => api.put<FinancialModel>(`/deals/${dealId}/financial-model`, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['financial-model', dealId], data);
      queryClient.invalidateQueries({ queryKey: ['field-changes', dealId] });
      queryClient.invalidateQueries({ queryKey: ['data-validations', dealId] });
    },
  });
}

export function useLockBaseline(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<FinancialModel>(`/deals/${dealId}/financial-model/lock-baseline`),
    onSuccess: (data) => {
      queryClient.setQueryData(['financial-model', dealId], data);
      queryClient.invalidateQueries({ queryKey: ['financial-model', dealId, 'bp-comparison'] });
    },
  });
}

export function useDeleteFinancialModel(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/deals/${dealId}/financial-model`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-model', dealId] });
      queryClient.invalidateQueries({ queryKey: ['field-changes', dealId] });
      queryClient.invalidateQueries({ queryKey: ['data-validations', dealId] });
    },
  });
}
