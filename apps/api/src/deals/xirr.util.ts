/**
 * D.4 — TRI réalisé. Résolveur XIRR générique (flux à dates irrégulières) —
 * le point de méthode explicitement soulevé par la spec complémentaire
 * ("à implémenter avec la même rigueur qu'un tableur financier
 * professionnel, pas une approximation simplifiée"). Contrairement au TRI
 * de scénario de D.1 (exactement 2 flux, formule fermée), un dossier réel
 * peut avoir un nombre quelconque de remboursements à des dates
 * quelconques — il n'existe pas de formule fermée, un solveur numérique
 * est la seule méthode correcte, pas un raccourci.
 *
 * Algorithme : Newton-Raphson (convergence rapide dans le cas courant),
 * avec repli automatique sur une bissection bornée si Newton-Raphson ne
 * converge pas ou diverge — les flux réels peuvent produire des fonctions
 * de VAN mal conditionnées (ex. un unique remboursement massif très tôt)
 * où Newton-Raphson seul n'est pas fiable.
 */

export interface CashFlow {
  date: Date;
  amount: number;
}

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;
const MAX_NEWTON_ITERATIONS = 100;
const MAX_BISECTION_ITERATIONS = 200;
const CONVERGENCE_TOLERANCE = 1e-7;
const NPV_TOLERANCE = 1e-6;

function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (YEAR_DAYS * DAY_MS);
}

function npv(cashFlows: CashFlow[], t0: Date, rate: number): number {
  return cashFlows.reduce((sum, cf) => sum + cf.amount / Math.pow(1 + rate, yearsBetween(t0, cf.date)), 0);
}

function dnpv(cashFlows: CashFlow[], t0: Date, rate: number): number {
  return cashFlows.reduce((sum, cf) => {
    const t = yearsBetween(t0, cf.date);
    return t === 0 ? sum : sum - (t * cf.amount) / Math.pow(1 + rate, t + 1);
  }, 0);
}

/**
 * Bissection sur une plage bornée [-0.9999, 100] (soit -99,99% à +10 000%
 * annualisé) — assez large pour tout cas réaliste de financement immobilier,
 * jamais infinie pour rester déterministe. Suppose npv(rateLow) et
 * npv(rateHigh) de signes opposés (un TRI existe forcément dans cette plage
 * dès qu'il y a au moins un flux négatif et un flux positif) ; renvoie null
 * si ce n'est pas le cas plutôt que d'extrapoler une racine qui n'existe pas.
 */
function bisectionXirr(cashFlows: CashFlow[], t0: Date): number | null {
  let low = -0.9999;
  let high = 100;
  let npvLow = npv(cashFlows, t0, low);
  let npvHigh = npv(cashFlows, t0, high);

  if (npvLow === 0) return low;
  if (npvHigh === 0) return high;
  if (Math.sign(npvLow) === Math.sign(npvHigh)) return null;

  for (let i = 0; i < MAX_BISECTION_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const npvMid = npv(cashFlows, t0, mid);
    if (Math.abs(npvMid) < NPV_TOLERANCE || high - low < CONVERGENCE_TOLERANCE) return mid;
    if (Math.sign(npvMid) === Math.sign(npvLow)) {
      low = mid;
      npvLow = npvMid;
    } else {
      high = mid;
      npvHigh = npvMid;
    }
  }
  return (low + high) / 2;
}

/**
 * Résout le TRI annualisé (XIRR) d'une série de flux à dates quelconques.
 * Renvoie null quand aucun TRI n'est mathématiquement défini (moins de 2
 * flux, ou tous les flux de même signe — jamais 0 comme valeur par défaut,
 * qui laisserait croire à un TRI nul réel).
 */
export function computeXirr(cashFlows: CashFlow[], guess = 0.1): number | null {
  if (cashFlows.length < 2) return null;
  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date;

  let rate = guess;
  for (let i = 0; i < MAX_NEWTON_ITERATIONS; i++) {
    const f = npv(sorted, t0, rate);
    const df = dnpv(sorted, t0, rate);
    if (Math.abs(df) < 1e-10) break;
    const nextRate = rate - f / df;
    if (!Number.isFinite(nextRate) || nextRate <= -1) break;
    if (Math.abs(nextRate - rate) < CONVERGENCE_TOLERANCE && Math.abs(npv(sorted, t0, nextRate)) < NPV_TOLERANCE) {
      return nextRate;
    }
    rate = nextRate;
  }

  // Newton-Raphson n'a pas convergé proprement (fonction mal conditionnée) — repli bissection.
  return bisectionXirr(sorted, t0);
}
