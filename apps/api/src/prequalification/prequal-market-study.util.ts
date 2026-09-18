/**
 * Étude de marché automatisée (spec ATLAS "Moteur de préqualification" v1.0,
 * §10) — moteur pur. Consomme les transactions DVF déjà récupérées par
 * `DvfSearchService` (Etalab/DGFiP, réutilisé tel quel — pas de nouveau
 * connecteur) et les agrégats déjà calculés du dossier (bilan financier,
 * lots), jamais de nouvelle donnée inventée.
 *
 * Simplifications assumées et documentées (P1) :
 * - Périmètre géographique = la commune résolue par `DvfSearchService`
 *   (pas de rayon paramétrable — spec §10.1 le prévoit comme axe futur).
 * - Période = la plus récente année disponible dans geo-dvf pour cette
 *   commune (`DvfSearchService` ne fusionne pas plusieurs années).
 * - §10.4 (analyses par typologie détaillées : terrains/appartements/
 *   maisons/vente en bloc) n'est pas couvert — hors de ce P1, les
 *   statistiques ci-dessous restent globales (Maison + Appartement déjà
 *   filtrés par DvfSearchService).
 * - La "sensibilité par lot et globale" (§10.2) est déjà couverte par le
 *   bloc Sensibilité de l'onglet Financier (3 scénarios ±10 %), pas
 *   dupliquée ici.
 */

export interface MarketStudyTransactionInput {
  pricePerSqm: number | null;
  price: number | null;
  date: string | null;
}

export interface PrequalMarketStudyInput {
  source: string;
  commune: string | null;
  transactions: MarketStudyTransactionInput[];
  /** Prix de sortie pondéré au m² du dossier (déjà calculé par prequal-financial.util.ts) — null si aucun lot avec prix ET surface renseignés. */
  prixSortiePondereParM2: number | null;
  /** Coût de revient recalculé du dossier. */
  coutDeRevient: number | null;
  /** Point mort au m² recalculé du dossier. */
  pointMortAuM2: number | null;
  /** Autres produits retenus pendant le portage (spec §9.2). */
  otherRevenueRetained: number | null;
  /** Marge cible — reprend la marge annoncée par l'opérateur (declaredMarginPct) faute d'un champ dédié "marge cible" en P0/P1. */
  targetMarginPct: number | null;
  /** Surface vendable totale (somme des lots ayant une surface renseignée). */
  totalSurfaceSqm: number;
  /** Nombre de lots du dossier. */
  lotCount: number;
}

export interface MarketStudyFilters {
  source: string;
  dateExtraction: string;
  commune: string | null;
  natureBien: string;
  sampleSize: number;
}

export interface MarketPopulationStats {
  median: number | null;
  average: number | null;
  q1: number | null;
  q3: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface MarketPositioning {
  prixSortiePondereParM2: number | null;
  ecartMedianePct: number | null;
  percentileRank: number | null;
  ventesAuDessusDuProjetCount: number | null;
  ticketMaxObserve: number | null;
  ecartPointMortPct: number | null;
  margeSiVenteMediane: number | null;
  margeSiVenteMedianePct: number | null;
  prixMinimalPourMargeCibleParM2: number | null;
}

export interface MarketLiquidity {
  ventesComparablesSurPeriode: number;
  ventesParMois: number | null;
  delaiMoyenEntreDeuxVentesJours: number | null;
  nombreDeLotsDuProjet: number;
  dureeTheoriqueEcoulementMois: number | null;
  echantillonTropFaible: boolean;
}

export interface PrequalMarketStudy {
  filters: MarketStudyFilters;
  population: MarketPopulationStats;
  positioning: MarketPositioning;
  liquidity: MarketLiquidity;
}

/** Sous ce nombre de transactions, une médiane/un percentile perd toute signification statistique — seuil illustratif, documenté comme tel. */
const MIN_SAMPLE_SIZE = 8;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return round2(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
  return round2(sorted[base]);
}

export function computeMarketStudy(input: PrequalMarketStudyInput): PrequalMarketStudy {
  const withPricePerSqm = input.transactions.filter((t): t is MarketStudyTransactionInput & { pricePerSqm: number } => t.pricePerSqm !== null && t.pricePerSqm > 0);
  const prices = withPricePerSqm.map((t) => t.pricePerSqm).sort((a, b) => a - b);

  const population: MarketPopulationStats = {
    median: quantile(prices, 0.5),
    average: prices.length > 0 ? round2(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    q1: quantile(prices, 0.25),
    q3: quantile(prices, 0.75),
    min: prices.length > 0 ? prices[0] : null,
    max: prices.length > 0 ? prices[prices.length - 1] : null,
    count: prices.length,
  };

  const filters: MarketStudyFilters = {
    source: input.source,
    dateExtraction: new Date().toISOString(),
    commune: input.commune,
    natureBien: 'Maison, Appartement',
    sampleSize: prices.length,
  };

  const median = population.median;
  const prixSortie = input.prixSortiePondereParM2;
  const ecartMedianePct = prixSortie !== null && median !== null && median > 0 ? Math.round(((prixSortie - median) / median) * 1000) / 10 : null;
  const percentileRank = prixSortie !== null && prices.length > 0 ? Math.round((prices.filter((p) => p <= prixSortie).length / prices.length) * 1000) / 10 : null;
  const ventesAuDessusDuProjetCount = prixSortie !== null ? prices.filter((p) => p > prixSortie).length : null;
  const ticketsObserves = input.transactions.map((t) => t.price).filter((p): p is number => p !== null);
  const ticketMaxObserve = ticketsObserves.length > 0 ? Math.max(...ticketsObserves) : null;
  const ecartPointMortPct =
    median !== null && input.pointMortAuM2 !== null && input.pointMortAuM2 > 0 ? Math.round(((median - input.pointMortAuM2) / input.pointMortAuM2) * 1000) / 10 : null;

  const otherRevenue = input.otherRevenueRetained ?? 0;
  const margeSiVenteMediane =
    median !== null && input.coutDeRevient !== null && input.totalSurfaceSqm > 0
      ? round2(median * input.totalSurfaceSqm + otherRevenue - input.coutDeRevient)
      : null;
  const caSiVenteMediane = median !== null && input.totalSurfaceSqm > 0 ? median * input.totalSurfaceSqm + otherRevenue : null;
  const margeSiVenteMedianePct = margeSiVenteMediane !== null && caSiVenteMediane !== null && caSiVenteMediane > 0 ? Math.round((margeSiVenteMediane / caSiVenteMediane) * 1000) / 10 : null;

  const prixMinimalPourMargeCibleParM2 =
    input.targetMarginPct !== null && input.targetMarginPct < 100 && input.coutDeRevient !== null && input.totalSurfaceSqm > 0
      ? round2((input.coutDeRevient / (1 - input.targetMarginPct / 100) - otherRevenue) / input.totalSurfaceSqm)
      : null;

  const positioning: MarketPositioning = {
    prixSortiePondereParM2: prixSortie,
    ecartMedianePct,
    percentileRank,
    ventesAuDessusDuProjetCount,
    ticketMaxObserve,
    ecartPointMortPct,
    margeSiVenteMediane,
    margeSiVenteMedianePct,
    prixMinimalPourMargeCibleParM2,
  };

  const dates = input.transactions.map((t) => t.date).filter((d): d is string => d !== null).sort();
  let ventesParMois: number | null = null;
  let delaiMoyenEntreDeuxVentesJours: number | null = null;
  let dureeTheoriqueEcoulementMois: number | null = null;
  if (dates.length >= 2) {
    const first = new Date(dates[0]).getTime();
    const last = new Date(dates[dates.length - 1]).getTime();
    const spanDays = Math.max(1, (last - first) / (1000 * 60 * 60 * 24));
    const spanMonths = spanDays / 30.44;
    ventesParMois = spanMonths > 0 ? round2(dates.length / spanMonths) : null;
    delaiMoyenEntreDeuxVentesJours = round2(spanDays / (dates.length - 1));
    dureeTheoriqueEcoulementMois = ventesParMois !== null && ventesParMois > 0 ? round2(input.lotCount / ventesParMois) : null;
  }

  const liquidity: MarketLiquidity = {
    ventesComparablesSurPeriode: dates.length,
    ventesParMois,
    delaiMoyenEntreDeuxVentesJours,
    nombreDeLotsDuProjet: input.lotCount,
    dureeTheoriqueEcoulementMois,
    echantillonTropFaible: prices.length < MIN_SAMPLE_SIZE,
  };

  return { filters, population, positioning, liquidity };
}
