import { computeXirr, type CashFlow } from './xirr.util';

/**
 * D.4 — Indicateur de valorisation (TRI / multiple) réalisé. Distinct du CRD
 * (crd.util.ts) : le CRD mesure une exposition résiduelle (combien reste dû
 * au prêteur), ce module mesure une performance d'investissement (combien
 * a été gagné sur le capital investi) — même donnée source (Repayment,
 * jamais les remboursements projetés), calcul complémentaire.
 *
 * S'applique dès qu'au moins un remboursement réalisé existe, pas seulement
 * aux dossiers totalement soldés (spec : "remboursé, totalement ou
 * partiellement") — sur un dossier encore actif, le TRI est donc un TRI
 * "réalisé à date", pas un TRI final, ce que le disclaimer explicite.
 */

export const REALIZED_PERFORMANCE_DISCLAIMER =
  "TRI et multiple calculés sur les remboursements réalisés à date (jamais les projetés) — sur un dossier encore actif, il s'agit d'un TRI réalisé à date, pas d'un TRI final.";

export interface RealizedPerformanceResult {
  /** null si aucun remboursement réalisé, ou si XIRR ne converge pas vers une racine réelle. */
  triRealisePct: number | null;
  /** Total perçu / capital investi. null si amountRaised <= 0 (ne devrait pas arriver en pratique). */
  multipleCapital: number | null;
  totalPercu: number;
  /** Mois entre le déblocage des fonds et le dernier remboursement réalisé — durée réelle "à date", pas la durée cible contractuelle (cf. A.3bis). */
  dureeReelleDetentionMois: number | null;
  tauxContractuelPct: number | null;
  /** triRealisePct - tauxContractuelPct, en points. Révèle l'impact des retards/remboursements anticipés/dégradations. */
  ecartTriVsContractuelPts: number | null;
}

const DAY_MS = 86_400_000;
const AVG_MONTH_DAYS = 30.44;

export function computeRealizedPerformance(
  amountRaised: number,
  startDate: Date | null | undefined,
  interestRatePct: number | null | undefined,
  realizedRepayments: { date: Date; amount: number }[],
): RealizedPerformanceResult {
  const totalPercu = realizedRepayments.reduce((sum, r) => sum + r.amount, 0);
  const multipleCapital = amountRaised > 0 ? Math.round((totalPercu / amountRaised) * 1000) / 1000 : null;
  const tauxContractuelPct = interestRatePct ?? null;

  if (!startDate || realizedRepayments.length === 0) {
    return { triRealisePct: null, multipleCapital, totalPercu: Math.round(totalPercu), dureeReelleDetentionMois: null, tauxContractuelPct, ecartTriVsContractuelPts: null };
  }

  // Un remboursement daté avant le déblocage des fonds est physiquement impossible — signale une
  // incohérence de données (ex. saisie erronée) plutôt qu'un vrai flux. Le TRI/la durée n'ont alors
  // aucun sens (on a vu un TRI à 22000% sur un jeu de données de test mal daté) : mieux vaut les
  // renvoyer non calculables que d'afficher un chiffre absurde comme s'il était valide.
  const hasRepaymentBeforeStart = realizedRepayments.some((r) => r.date.getTime() < startDate.getTime());
  if (hasRepaymentBeforeStart) {
    return { triRealisePct: null, multipleCapital, totalPercu: Math.round(totalPercu), dureeReelleDetentionMois: null, tauxContractuelPct, ecartTriVsContractuelPts: null };
  }

  const cashFlows: CashFlow[] = [{ date: startDate, amount: -amountRaised }, ...realizedRepayments.map((r) => ({ date: r.date, amount: r.amount }))];
  const xirr = computeXirr(cashFlows);
  const triRealisePct = xirr !== null ? Math.round(xirr * 1000) / 10 : null;

  const lastRepaymentDate = realizedRepayments.reduce((latest, r) => (r.date.getTime() > latest.getTime() ? r.date : latest), realizedRepayments[0].date);
  const dureeReelleDetentionMois = Math.round(((lastRepaymentDate.getTime() - startDate.getTime()) / (AVG_MONTH_DAYS * DAY_MS)) * 10) / 10;

  const ecartTriVsContractuelPts =
    triRealisePct !== null && tauxContractuelPct !== null ? Math.round((triRealisePct - tauxContractuelPct) * 10) / 10 : null;

  return { triRealisePct, multipleCapital, totalPercu: Math.round(totalPercu), dureeReelleDetentionMois, tauxContractuelPct, ecartTriVsContractuelPts };
}
