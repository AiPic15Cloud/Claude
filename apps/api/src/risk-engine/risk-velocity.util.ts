export type VelocityBand = 'STABLE' | 'DETERIORATION' | 'DERIVE' | 'DETERIORATION_RAPIDE';
export type VelocityDirection = 'AGGRAVATION' | 'AMELIORATION' | 'STABLE';

export interface Velocity {
  band: VelocityBand;
  direction: VelocityDirection;
  /** Écart du score composite depuis le point comparé (fenêtre de 90 jours). */
  delta: number | null;
}

/**
 * Vitesse de détérioration du score composite sur une fenêtre de 90 jours
 * (l'exemple donné dans le brief) — bandes paramétrables, pas de seuil en dur
 * ailleurs dans le code. Seule la direction AGGRAVATION alimente l'escalade
 * du statut de surveillance (surveillance-status.util.ts) : une amélioration
 * rapide n'a pas vocation à forcer un statut pire.
 */
export function classifyVelocity(deltaComposite: number | null): Velocity {
  if (deltaComposite === null) return { band: 'STABLE', direction: 'STABLE', delta: null };

  const abs = Math.abs(deltaComposite);
  const band: VelocityBand = abs <= 3 ? 'STABLE' : abs <= 8 ? 'DETERIORATION' : abs <= 15 ? 'DERIVE' : 'DETERIORATION_RAPIDE';
  const direction: VelocityDirection = deltaComposite > 0 ? 'AGGRAVATION' : deltaComposite < 0 ? 'AMELIORATION' : 'STABLE';

  return { band, direction, delta: deltaComposite };
}
