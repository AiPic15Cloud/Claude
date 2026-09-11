/**
 * Comparable Project Engine (spec V3 §20.2) — similarité entre dossiers
 * Fractionné du même utilisateur (la visibilité scopée au créateur, patch
 * V3.2 §1, s'applique aussi ici : jamais de comparaison inter-utilisateurs).
 * Dimensions retenues pour P1 — localisation, taille, rendement, statut —
 * parmi celles listées par la spec ; asset class/strategy/risk profile ne
 * sont pas des champs saisis en P0/P1 et restent hors périmètre plutôt que
 * d'inventer une taxonomie non alimentée.
 */

export interface ComparableFeatures {
  projectId: string;
  name: string;
  city: string | null;
  status: string;
  prixNetVendeur: number | null;
  grossYieldPct: number | null;
}

export interface ComparableResult extends ComparableFeatures {
  similarityScore: number;
}

const WEIGHT_CITY = 0.3;
const WEIGHT_SIZE = 0.35;
const WEIGHT_YIELD = 0.35;

function sizeSimilarity(a: number | null, b: number | null): number {
  if (a === null || b === null || a === 0) return 0;
  const ratio = Math.min(a, b) / Math.max(a, b);
  return ratio;
}

function yieldSimilarity(a: number | null, b: number | null): number {
  if (a === null || b === null) return 0;
  const diff = Math.abs(a - b);
  return Math.max(0, 1 - diff / 10); // écart de 10 points de rendement = similarité nulle
}

export function findComparables(target: ComparableFeatures, candidates: ComparableFeatures[], limit = 5): ComparableResult[] {
  return candidates
    .filter((c) => c.projectId !== target.projectId)
    .map((c) => {
      const citySim = target.city && c.city && target.city.toLowerCase() === c.city.toLowerCase() ? 1 : 0;
      const sizeSim = sizeSimilarity(target.prixNetVendeur, c.prixNetVendeur);
      const yieldSim = yieldSimilarity(target.grossYieldPct, c.grossYieldPct);
      const similarityScore = citySim * WEIGHT_CITY + sizeSim * WEIGHT_SIZE + yieldSim * WEIGHT_YIELD;
      return { ...c, similarityScore };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}
