import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ScoreBreakdown } from '@/types';

export function useDealScore(dealId: string) {
  return useQuery({
    queryKey: ['score', dealId],
    queryFn: () => api.get<ScoreBreakdown>(`/deals/${dealId}/score`),
  });
}

export function useRecomputeScore(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ScoreBreakdown>(`/deals/${dealId}/score/recompute`),
    onSuccess: (data) => {
      queryClient.setQueryData(['score', dealId], data);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
