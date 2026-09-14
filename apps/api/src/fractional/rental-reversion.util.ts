/**
 * Rental Market & Rental Reversion Engine (spec V3.1 §9) — jusqu'ici
 * `ervAnnuel` (valeur locative de marché estimée) était saisi au niveau du
 * bail (create-lease.dto.ts, colonne Prisma) mais jamais lu par aucun
 * moteur ni affiché dans l'UI : un dossier pouvait porter un ERV renseigné
 * sans que rien n'en tienne compte.
 *
 * Doctrine §9 : "un rendement élevé obtenu grâce à des loyers au-dessus du
 * marché doit être pénalisé ; un actif sous-loué peut au contraire contenir
 * une réserve de croissance, sous réserve du risque de renouvellement."
 * Ce moteur ne pénalise ni ne bonifie automatiquement aucun rendement —
 * il expose la reversion comme donnée décomposée (jamais un ajustement
 * silencieux du NOI), à charge pour l'IC Engine / l'utilisateur d'en tenir
 * compte. `break-event.util.ts` consomme en revanche directement l'ERV
 * comme base de reloc réelle quand disponible (au lieu d'un proxy générique).
 */

export type ReversionStatus = 'OVER_RENTED' | 'AT_MARKET' | 'UNDER_RENTED' | 'ERV_MISSING';

/** Bande autour de 0% de reversion considérée "au marché" — écart normal de méthode d'estimation, pas un signal. */
export const REVERSION_AT_MARKET_BAND_PCT = 5;

export interface LeaseReversionInput {
  id: string;
  tenantName: string;
  loyerFacialAnnuel: number;
  /** Valeur locative de marché estimée — null = non renseignée, jamais traité comme "au marché" par défaut (Unknown ≠ Zero). */
  ervAnnuel: number | null;
}

export interface LeaseReversionResult {
  leaseId: string;
  tenantName: string;
  passingRent: number;
  ervAnnuel: number | null;
  /** (ERV - Passing Rent) / Passing Rent × 100. Positif = sous-loué (réserve de hausse), négatif = sur-loué. Null si non calculable. */
  reversionPct: number | null;
  status: ReversionStatus;
}

export function computeLeaseReversion(lease: LeaseReversionInput): LeaseReversionResult {
  const base: Pick<LeaseReversionResult, 'leaseId' | 'tenantName' | 'passingRent' | 'ervAnnuel'> = {
    leaseId: lease.id,
    tenantName: lease.tenantName,
    passingRent: lease.loyerFacialAnnuel,
    ervAnnuel: lease.ervAnnuel,
  };

  // ERV absente, ou loyer facial nul/négatif (comparaison non significative) : jamais deviné.
  if (lease.ervAnnuel === null || lease.loyerFacialAnnuel <= 0) {
    return { ...base, reversionPct: null, status: 'ERV_MISSING' };
  }

  const reversionPct = ((lease.ervAnnuel - lease.loyerFacialAnnuel) / lease.loyerFacialAnnuel) * 100;
  const status: ReversionStatus =
    reversionPct > REVERSION_AT_MARKET_BAND_PCT ? 'UNDER_RENTED' : reversionPct < -REVERSION_AT_MARKET_BAND_PCT ? 'OVER_RENTED' : 'AT_MARKET';

  return { ...base, reversionPct, status };
}

export interface PortfolioReversionResult {
  leases: LeaseReversionResult[];
  /** Moyenne pondérée par le loyer facial, calculée uniquement sur les baux avec ERV connue — null si aucun bail n'a d'ERV renseignée. */
  weightedReversionPct: number | null;
  overRentedCount: number;
  atMarketCount: number;
  underRentedCount: number;
  ervMissingCount: number;
  totalCount: number;
  /** Part du loyer total portée par des baux sans ERV renseignée — matérialité de la donnée manquante, jamais masquée par la moyenne pondérée. */
  rentPctErvMissing: number;
}

export function computePortfolioReversion(leases: LeaseReversionInput[]): PortfolioReversionResult {
  const results = leases.map(computeLeaseReversion);

  const totalRent = leases.reduce((sum, l) => sum + l.loyerFacialAnnuel, 0);
  const knownRent = results.filter((r) => r.reversionPct !== null).reduce((sum, r) => sum + r.passingRent, 0);
  const weightedSum = results.reduce((sum, r) => sum + (r.reversionPct !== null ? r.reversionPct * r.passingRent : 0), 0);
  const missingRent = totalRent - knownRent;

  return {
    leases: results,
    weightedReversionPct: knownRent > 0 ? weightedSum / knownRent : null,
    overRentedCount: results.filter((r) => r.status === 'OVER_RENTED').length,
    atMarketCount: results.filter((r) => r.status === 'AT_MARKET').length,
    underRentedCount: results.filter((r) => r.status === 'UNDER_RENTED').length,
    ervMissingCount: results.filter((r) => r.status === 'ERV_MISSING').length,
    totalCount: results.length,
    rentPctErvMissing: totalRent > 0 ? (missingRent / totalRent) * 100 : 0,
  };
}
