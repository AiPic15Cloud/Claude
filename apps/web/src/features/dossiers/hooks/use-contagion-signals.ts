import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContagionSignal } from '@/types';

/** Market Relationship & Contagion Intelligence V2, §10 — signaux persistés (jamais recalculés côté client). */
export function useContagionSignals(dealId: string) {
  return useQuery({
    queryKey: ['contagion-signals', dealId],
    queryFn: () => api.get<ContagionSignal[]>(`/deals/${dealId}/contagion-signals`),
  });
}
