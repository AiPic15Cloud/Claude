import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RiskBreakdown } from '@/types';

export function useDealRisk(dealId: string) {
  return useQuery({
    queryKey: ['risk', dealId],
    queryFn: () => api.get<RiskBreakdown>(`/deals/${dealId}/risk`),
  });
}

export function useRecomputeRisk(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<RiskBreakdown>(`/deals/${dealId}/risk/recompute`),
    onSuccess: (data) => {
      queryClient.setQueryData(['risk', dealId], data);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
