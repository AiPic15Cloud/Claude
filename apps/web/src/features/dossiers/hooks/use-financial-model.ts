import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FinancialModel } from '@/types';

export function useFinancialModel(dealId: string) {
  return useQuery({
    queryKey: ['financial-model', dealId],
    queryFn: () => api.get<FinancialModel>(`/deals/${dealId}/financial-model`),
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
