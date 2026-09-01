export type MarketPriceTypology = 'MAISON' | 'APPARTEMENT' | 'TERRAIN_A_BATIR';

export interface SourcePriceResult {
  source: string;
  available: boolean;
  priceLow: number | null;
  priceMid: number | null;
  priceHigh: number | null;
  /** Raison de l'indisponibilité — jamais masquée, cf. spec ATLAS v2, C.8 ("comportement en cas d'échec d'une source"). */
  error?: string;
}

export interface MarketPriceResult {
  query: string;
  arrondissementPostcode: string | null;
  typology: MarketPriceTypology;
  sources: SourcePriceResult[];
  /** Moyenne simple non pondérée des sources ayant répondu — null si aucune n'a répondu. */
  average: { priceLow: number; priceMid: number; priceHigh: number } | null;
  exitPricePerSqm: number | null;
}
