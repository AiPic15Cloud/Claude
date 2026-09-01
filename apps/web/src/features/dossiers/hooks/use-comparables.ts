import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ComparableDeal } from '@/types';

/** D.2 — comparables internes : autres dossiers du portefeuille, même ville ou même typologie. */
export function useComparables(dealId: string) {
  return useQuery({
    queryKey: ['comparables', dealId],
    queryFn: () => api.get<ComparableDeal[]>(`/deals/${dealId}/comparables`),
  });
}
