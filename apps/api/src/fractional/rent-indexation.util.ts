import type { FractionalIndexationType } from '@prisma/client';

/**
 * Indexation des loyers par bail (patch V3.2 §2 + spec §7) — remplace la
 * croissance uniforme rentGrowthPctPerYear (AssumptionSet) par le taux
 * propre à l'indice de référence de chaque bail (ILC/ILAT/IRL/ICC), dérivé
 * des RentIndexSeries partagées au niveau organisation, avec cap/floor
 * contractuels. Un bail en indexation "AUTRE", ou sans série de marché
 * disponible pour son indice, retombe sur rentGrowthPctPerYear — neutre,
 * jamais un taux inventé (même doctrine que tenant-covenant.util.ts :
 * donnée absente ⇒ fallback documenté, jamais une pénalité ou un bonus
 * silencieux).
 */

export type MarketRentIndexType = 'ILC' | 'ILAT' | 'IRL' | 'ICC';

export interface RentIndexSeriesRow {
  indexType: MarketRentIndexType;
  cagr5y: number | null;
  asOfDate: Date;
}

export type IndexGrowthRates = Partial<Record<MarketRentIndexType, number>>;

/**
 * Un taux de croissance par type d'indice — le cagr5y de la série la plus
 * récente (asOfDate) pour ce type. cagr5y est choisi plutôt qu'une variation
 * période-sur-période car les séries peuvent être trimestrielles ou
 * annuelles selon l'indice/la source ; annualiser une variation brute sans
 * connaître la granularité produirait un taux non fiable. Un indice sans
 * cagr5y renseigné n'apparaît simplement pas dans le résultat (fallback
 * côté appelant), plutôt que de produire un taux à 0% qui se ferait passer
 * pour une donnée réelle.
 */
export function computeIndexGrowthRates(series: RentIndexSeriesRow[]): IndexGrowthRates {
  const latestByType = new Map<MarketRentIndexType, RentIndexSeriesRow>();
  for (const row of series) {
    const current = latestByType.get(row.indexType);
    if (!current || row.asOfDate.getTime() > current.asOfDate.getTime()) latestByType.set(row.indexType, row);
  }
  const rates: IndexGrowthRates = {};
  for (const [type, row] of latestByType) {
    if (row.cagr5y !== null) rates[type] = row.cagr5y;
  }
  return rates;
}

export interface IndexedLeaseInput {
  loyerFacialAnnuel: number;
  indexation: FractionalIndexationType;
  indexationCapPct: number | null;
  indexationFloorPct: number | null;
}

/** Taux de croissance annuel effectif d'un bail : indice de marché si disponible et pertinent (pas AUTRE), sinon fallback, puis cap/floor contractuels. */
export function resolveLeaseGrowthPct(
  lease: Pick<IndexedLeaseInput, 'indexation' | 'indexationCapPct' | 'indexationFloorPct'>,
  indexGrowthRates: IndexGrowthRates,
  fallbackGrowthPct: number,
): number {
  const marketRate = lease.indexation === 'AUTRE' ? undefined : indexGrowthRates[lease.indexation as MarketRentIndexType];
  let rate = marketRate ?? fallbackGrowthPct;
  if (lease.indexationFloorPct !== null) rate = Math.max(rate, lease.indexationFloorPct);
  if (lease.indexationCapPct !== null) rate = Math.min(rate, lease.indexationCapPct);
  return rate;
}

/** GPR d'une année donnée (1 = première année de détention) — chaque bail composé à son propre taux, puis sommés. */
export function projectIndexedGpr(leases: IndexedLeaseInput[], indexGrowthRates: IndexGrowthRates, fallbackGrowthPct: number, year: number): number {
  return leases.reduce((sum, lease) => {
    const growthPct = resolveLeaseGrowthPct(lease, indexGrowthRates, fallbackGrowthPct);
    return sum + lease.loyerFacialAnnuel * Math.pow(1 + growthPct / 100, year - 1);
  }, 0);
}
