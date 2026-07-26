import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeesSummary } from '@/types';

export function useFeesSummary(year: number) {
  return useQuery({
    queryKey: ['fees', 'summary', year],
    queryFn: () => api.get<FeesSummary>(`/fees/summary?year=${year}`),
  });
}

export function useSetFeesTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { year: number; targetAmount: number }) => api.put('/fees/target', payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fees', 'summary', variables.year] });
    },
  });
}
