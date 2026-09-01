import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RiskProfile {
  catnat: { count: number; recent: { libelle: string | null; dateDebut: string | null; dateFin: string | null }[] } | null;
  floodZone: { present: boolean; niveau: string | null } | null;
  seismicZone: { present: boolean; niveau: string | null } | null;
  zonage: { type: string | null; libelle: string | null }[] | null;
  nearby: { schools: number; healthcare: number; shops: number; transitStops: number } | null;
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

export interface DpeResult {
  label: string | null;
  ghgLabel: string | null;
  date: string | null;
  matchedAddress: string | null;
}

export function useDpe(dealId: string, hasPostcode: boolean) {
  return useQuery({
    queryKey: ['dpe', dealId],
    // "Aucun DPE trouvé" est un résultat normal (pas une absence de contenu) — l'API renvoie
    // null, mais un corps vide se réduit à `undefined` côté client (cf. lib/api.ts), que
    // react-query interdit explicitement de renvoyer depuis une queryFn. On le ramène à null.
    queryFn: async () => (await api.get<DpeResult | null>(`/deals/${dealId}/dpe`)) ?? null,
    enabled: Boolean(dealId) && hasPostcode,
    staleTime: 60 * 60_000,
    retry: false,
  });
}
