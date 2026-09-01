import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

export type FreshnessTier = 'FRESH' | 'CURRENT' | 'AGING' | 'STALE' | 'UNKNOWN';

const DAY_MS = 24 * 60 * 60 * 1000;

export function freshnessTier(checkedAt: string | Date | null | undefined, now: Date = new Date()): FreshnessTier {
  if (!checkedAt) return 'UNKNOWN';
  const days = (now.getTime() - new Date(checkedAt).getTime()) / DAY_MS;
  if (days <= 30) return 'FRESH';
  if (days <= 90) return 'CURRENT';
  if (days <= 180) return 'AGING';
  return 'STALE';
}

const TIER_LABEL: Record<FreshnessTier, string> = {
  FRESH: 'Fraîche (< 30 j)',
  CURRENT: 'Actuelle (30–90 j)',
  AGING: 'Vieillissante (90–180 j)',
  STALE: 'Périmée (> 180 j)',
  UNKNOWN: 'Jamais vérifiée',
};

const TIER_DOT: Record<FreshnessTier, string> = {
  FRESH: 'bg-success',
  CURRENT: 'bg-warning',
  AGING: 'bg-warning/60',
  STALE: 'bg-destructive',
  UNKNOWN: 'bg-muted-foreground/40',
};

/**
 * Badge de fraîcheur systématique (spec ATLAS v2, section 0.3) — à poser sur
 * toute donnée issue d'une source externe (SIRENE, BODACC, Géorisques,
 * ADEME...). Le référentiel définit 4 paliers avec une couleur dédiée
 * chacune ; l'app n'a que 3 tons sémantiques (success/warning/destructive),
 * donc "Actuelle" et "Vieillissante" partagent le ton warning à opacité
 * différente plutôt que d'ajouter une 4ᵉ couleur ad hoc au design system.
 * Toujours visible (contrairement aux badges de statut "silencieux si sain")
 * puisque la fraîcheur elle-même est l'information à transmettre ici.
 */
export function FreshnessBadge({ checkedAt, label }: { checkedAt: string | Date | null | undefined; label?: string }) {
  const tier = freshnessTier(checkedAt);
  const dateText = checkedAt ? `vérifié le ${formatDate(checkedAt)}` : 'jamais vérifié';
  const title = label ? `${label} — ${TIER_LABEL[tier]} — ${dateText}` : `${TIER_LABEL[tier]} — ${dateText}`;

  return (
    <span title={title} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', TIER_DOT[tier])} />
      {label && <span>{label} :</span>}
      <span className="text-muted-foreground/80">{dateText}</span>
    </span>
  );
}
