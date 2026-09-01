import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Deal, LoanLifecycle } from '@/types';

export function useLoanLifecycle(dealId: string) {
  return useQuery({
    queryKey: ['loan-lifecycle', dealId],
    queryFn: () => api.get<LoanLifecycle>(`/deals/${dealId}/loan-lifecycle`),
    enabled: Boolean(dealId),
  });
}

export interface ExtendDeadlinePayload {
  dateSignature: string;
  nouvelleDateEcheance: string;
}

/** Prorogation formelle (spec ATLAS v2, A.3bis) — distincte du PATCH générique du deal, crée un LoanExtension traçable. */
export function useExtendDeadline(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExtendDeadlinePayload) => api.post<Deal>(`/deals/${dealId}/extend-deadline`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-lifecycle', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['field-changes', dealId] });
      queryClient.invalidateQueries({ queryKey: ['activities', dealId] });
    },
  });
}
