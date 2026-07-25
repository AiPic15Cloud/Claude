import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CockpitSummary } from '@/types';

export function useCockpitSummary() {
  return useQuery({
    queryKey: ['cockpit', 'summary'],
    queryFn: () => api.get<CockpitSummary>('/cockpit/summary'),
    refetchInterval: 60_000,
  });
}
