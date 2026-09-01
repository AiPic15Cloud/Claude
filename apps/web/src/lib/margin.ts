export type MarginTier = 'vert' | 'jaune' | 'orange' | 'rouge';

/**
 * Mêmes seuils que MARGIN_SCALE (apps/api/src/agents/agent-registry.ts) —
 * la grille de couleur que les agents IA appliquent déjà en texte (🟢🟡🟠🔴).
 * Garder ces deux définitions synchronisées si les seuils changent.
 */
export function marginTier(marginPct: number): MarginTier {
  if (marginPct > 30) return 'vert';
  if (marginPct >= 20) return 'jaune';
  if (marginPct >= 10) return 'orange';
  return 'rouge';
}

export const MARGIN_TIER_STYLES: Record<MarginTier, { dot: string; text: string; border: string; bg: string }> = {
  vert: { dot: '🟢', text: 'text-success', border: 'border-success/40', bg: 'bg-success/5' },
  jaune: { dot: '🟡', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/5' },
  orange: { dot: '🟠', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/5' },
  rouge: { dot: '🔴', text: 'text-destructive', border: 'border-destructive/40', bg: 'bg-destructive/5' },
};
