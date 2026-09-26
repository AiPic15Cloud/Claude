import { useMutation, useQuery } from '@tanstack/react-query';
import { api, API_URL } from '@/lib/api';
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

/**
 * Rapport portefeuille en PDF, généré côté serveur (même "vraie correction"
 * que l'export pré-comité Préqual — window.print() ne fonctionne quasiment
 * pas sur Chrome Android).
 */
export function useExportPortfolioReportPdf() {
  return useMutation({
    mutationFn: async () => {
      const blob = await api.getBlob(`${API_URL}/cockpit/report-pdf`);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'rapport-portefeuille.pdf';
      link.click();
      URL.revokeObjectURL(objectUrl);
    },
  });
}
