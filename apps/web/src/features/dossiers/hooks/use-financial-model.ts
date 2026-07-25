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
}

export function useSaveFinancialModel(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FinancialAssumptionPayload) => api.put<FinancialModel>(`/deals/${dealId}/financial-model`, payload),
    onSuccess: (data) => queryClient.setQueryData(['financial-model', dealId], data),
  });
}
