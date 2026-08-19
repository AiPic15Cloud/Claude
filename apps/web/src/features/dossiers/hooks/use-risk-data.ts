import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RiskProfile {
  catnat: { count: number; recent: { libelle: string | null; dateDebut: string | null; dateFin: string | null }[] } | null;
  floodZone: { count: number } | null;
  seismicZone: { zone: string | null } | null;
  zonage: { type: string | null; libelle: string | null }[] | null;
}

export function useRiskData(dealId: string, hasCoords: boolean) {
  return useQuery({
    queryKey: ['risk-data', dealId],
    queryFn: () => api.get<RiskProfile>(`/deals/${dealId}/risk-data`),
    enabled: Boolean(dealId) && hasCoords,
    staleTime: 60 * 60_000,
    retry: false,
  });
}
