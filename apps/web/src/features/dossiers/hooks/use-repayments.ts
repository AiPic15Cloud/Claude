import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Repayment } from '@/types';

export function useRepayments(dealId: string) {
  return useQuery({
    queryKey: ['repayments', dealId],
    queryFn: () => api.get<Repayment[]>(`/deals/${dealId}/repayments`),
  });
}

export interface CreateRepaymentPayload {
  amount: number;
  date: string;
  projected?: boolean;
  note?: string;
}

export function useCreateRepayment(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRepaymentPayload) => api.post<Repayment>(`/deals/${dealId}/repayments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repayments', dealId] });
      queryClient.invalidateQueries({ queryKey: ['repayments-summary'] });
    },
  });
}

export function useDeleteRepayment(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${dealId}/repayments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repayments', dealId] });
      queryClient.invalidateQueries({ queryKey: ['repayments-summary'] });
    },
  });
}
