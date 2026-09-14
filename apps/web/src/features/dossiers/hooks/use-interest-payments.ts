import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { InterestPayment, InterestPaymentStatus } from '@/types';

export function useInterestPayments(dealId: string) {
  return useQuery({
    queryKey: ['interest-payments', dealId],
    queryFn: () => api.get<InterestPayment[]>(`/deals/${dealId}/interest-payments`),
  });
}

export function useInterestPaymentStatus(dealId: string) {
  return useQuery({
    queryKey: ['interest-payments', dealId, 'status'],
    queryFn: async () => (await api.get<InterestPaymentStatus | null>(`/deals/${dealId}/interest-payments/status`)) ?? null,
  });
}

export interface CreateInterestPaymentPayload {
  paidDate: string;
  amount?: number;
  note?: string;
}

export function useCreateInterestPayment(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInterestPaymentPayload) => api.post<InterestPayment>(`/deals/${dealId}/interest-payments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interest-payments', dealId] });
    },
  });
}

export function useUpdateInterestPayment(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: CreateInterestPaymentPayload & { id: string }) =>
      api.patch<InterestPayment>(`/deals/${dealId}/interest-payments/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interest-payments', dealId] });
    },
  });
}

export function useDeleteInterestPayment(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${dealId}/interest-payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interest-payments', dealId] });
    },
  });
}
