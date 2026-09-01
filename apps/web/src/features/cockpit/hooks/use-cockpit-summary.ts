import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CockpitSummary, PortfolioReport } from '@/types';

export function useCockpitSummary() {
  return useQuery({
    queryKey: ['cockpit', 'summary'],
    queryFn: () => api.get<CockpitSummary>('/cockpit/summary'),
    refetchInterval: 60_000,
  });
}

/** Export structuré portefeuille (spec ATLAS v2, A.11) — déclenché au clic, pas préchargé. */
export function useExportPortfolioReport() {
  return useMutation({
    mutationFn: () => api.get<PortfolioReport>('/cockpit/report'),
  });
}
