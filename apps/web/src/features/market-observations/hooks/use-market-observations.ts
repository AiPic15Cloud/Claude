import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MarketObservationEvent, ProjectObservation } from '@/types';

export function useProjectObservations() {
  return useQuery({
    queryKey: ['market-observations'],
    queryFn: () => api.get<ProjectObservation[]>('/market-observations'),
  });
}

export function useMarketObservationEvents() {
  return useQuery({
    queryKey: ['market-observations', 'events'],
    queryFn: () => api.get<MarketObservationEvent[]>('/market-observations/events'),
  });
}

/** Synchronisation manuelle du pilote (spec ATLAS v2, C.3) — en plus du cron toutes les 6h côté serveur. */
export function useSyncMarketObservations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ totalObserved: number; sources: number }>('/market-observations/sync'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-observations'] });
      queryClient.invalidateQueries({ queryKey: ['source-registry'] });
    },
  });
}
