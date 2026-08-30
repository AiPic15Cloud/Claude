/**
 * Score composite "Risque ATLAS" (headline /100, plus haut = pire) — combine
 * les 3 scores indépendants plutôt que de les remplacer. L'EWS pèse le plus
 * (40%) car c'est le signal le plus actuel d'un problème imminent, suivi de
 * la Performance (35%, exécution réelle déjà observable) puis de la Qualité
 * (25%, structurelle et plus stable). Même logique de pondération métier non
 * calibrée statistiquement que l'ancien système à 7 facteurs — voir
 * METHODOLOGY_DISCLAIMER dans risk-engine.service.ts.
 */
export const COMPOSITE_WEIGHTS = { quality: 0.25, performance: 0.35, ews: 0.4 } as const;

export function computeCompositeRisk(qualityScore: number, performanceScore: number, ewsScore: number): number {
  const raw = COMPOSITE_WEIGHTS.quality * (100 - qualityScore) + COMPOSITE_WEIGHTS.performance * (100 - performanceScore) + COMPOSITE_WEIGHTS.ews * ewsScore;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
