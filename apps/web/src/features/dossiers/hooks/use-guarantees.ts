import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Guarantee, GuaranteeStatus, GuaranteeType } from '@/types';

export function useGuarantees(dealId: string) {
  return useQuery({
    queryKey: ['guarantees', dealId],
    queryFn: () => api.get<Guarantee[]>(`/deals/${dealId}/guarantees`),
  });
}

export interface CreateGuaranteePayload {
  type: GuaranteeType;
  description: string;
  amount: number;
  rank?: number;
  status?: GuaranteeStatus;
}

export function useCreateGuarantee(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGuaranteePayload) => api.post<Guarantee>(`/deals/${dealId}/guarantees`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guarantees', dealId] }),
  });
}

export function useUpdateGuarantee(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<CreateGuaranteePayload>) =>
      api.patch<Guarantee>(`/deals/${dealId}/guarantees/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guarantees', dealId] }),
  });
}

export function useDeleteGuarantee(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${dealId}/guarantees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guarantees', dealId] }),
  });
}
