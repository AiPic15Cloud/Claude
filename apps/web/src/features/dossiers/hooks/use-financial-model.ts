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
  constructionCostPerSqm: number;
  sellingPricePerSqm: number;
  otherCosts?: number;
  targetMarginPct?: number;
  notes?: string;
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
