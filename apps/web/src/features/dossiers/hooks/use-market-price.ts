import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type MarketPriceTypology = 'MAISON' | 'APPARTEMENT' | 'TERRAIN_A_BATIR';

export interface MarketPriceSourceResult {
  source: string;
  available: boolean;
  priceLow: number | null;
  priceMid: number | null;
  priceHigh: number | null;
  error?: string;
}

export interface MarketPriceResult {
  query: string;
  arrondissementPostcode: string | null;
  typology: MarketPriceTypology;
  sources: MarketPriceSourceResult[];
  average: { priceLow: number; priceMid: number; priceHigh: number } | null;
  exitPricePerSqm: number | null;
}

/** Recherche de prix au m² à la demande (spec ATLAS v2, C.8) — déclenchée au clic, pas préchargée. */
export function useMarketPrice(dealId: string) {
  return useMutation({
    mutationFn: (typology: MarketPriceTypology) =>
      api.get<MarketPriceResult>(`/deals/${dealId}/market-price?typology=${typology}`),
  });
}
