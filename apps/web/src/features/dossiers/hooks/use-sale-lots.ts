import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SaleLot } from '@/types';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, dealId: string) {
  queryClient.invalidateQueries({ queryKey: ['financial-model', dealId] });
  queryClient.invalidateQueries({ queryKey: ['field-changes', dealId] });
  queryClient.invalidateQueries({ queryKey: ['data-validations', dealId] });
}

export function useCreateSaleLot(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { label: string; surfaceSqm: number; salePrice: number; sold?: boolean }) =>
      api.post<SaleLot>(`/deals/${dealId}/sale-lots`, payload),
    onSuccess: () => invalidateAll(queryClient, dealId),
  });
}

export function useUpdateSaleLot(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lotId, ...payload }: { lotId: string; label?: string; surfaceSqm?: number; salePrice?: number; sold?: boolean }) =>
      api.patch<SaleLot>(`/deals/${dealId}/sale-lots/${lotId}`, payload),
    onSuccess: () => invalidateAll(queryClient, dealId),
  });
}

export function useDeleteSaleLot(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lotId: string) => api.delete(`/deals/${dealId}/sale-lots/${lotId}`),
    onSuccess: () => invalidateAll(queryClient, dealId),
  });
}
