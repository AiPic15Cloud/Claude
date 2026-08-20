import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CostLineItem } from '@/types';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, dealId: string) {
  queryClient.invalidateQueries({ queryKey: ['financial-model', dealId] });
  queryClient.invalidateQueries({ queryKey: ['field-changes', dealId] });
  queryClient.invalidateQueries({ queryKey: ['data-validations', dealId] });
}

export type CostLineItemCategory = 'TRAVAUX' | 'HONORAIRES_TECHNIQUES';

export function useCreateCostLineItem(dealId: string, category: CostLineItemCategory = 'TRAVAUX') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { label: string; amount: number }) =>
      api.post<CostLineItem>(`/deals/${dealId}/cost-line-items`, { category, ...payload }),
    onSuccess: () => invalidateAll(queryClient, dealId),
  });
}

export function useUpdateCostLineItem(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...payload }: { itemId: string; label?: string; amount?: number }) =>
      api.patch<CostLineItem>(`/deals/${dealId}/cost-line-items/${itemId}`, payload),
    onSuccess: () => invalidateAll(queryClient, dealId),
  });
}

export function useDeleteCostLineItem(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/deals/${dealId}/cost-line-items/${itemId}`),
    onSuccess: () => invalidateAll(queryClient, dealId),
  });
}
