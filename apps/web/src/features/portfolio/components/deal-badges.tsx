import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DEAL_STAGE_LABELS, DEAL_TYPE_LABELS, type CheckpointHealth, type DealStage, type DealType } from '@/types';

const STAGE_VARIANT: Record<DealStage, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  SOURCING: 'outline',
  ANALYSE: 'secondary',
  COMITE: 'secondary',
  MONTAGE: 'default',
  COLLECTE: 'default',
  FINANCE: 'success',
  SUIVI: 'success',
  REMBOURSE: 'success',
  DEFAUT: 'destructive',
};

export function StageBadge({ stage }: { stage: DealStage }) {
  return <Badge variant={STAGE_VARIANT[stage]}>{DEAL_STAGE_LABELS[stage]}</Badge>;
}

export function TypeBadge({ type }: { type: DealType }) {
  return <Badge variant="outline">{DEAL_TYPE_LABELS[type]}</Badge>;
}

const CHECKPOINT_HEALTH_LABEL: Record<'VERT' | 'ORANGE' | 'ROUGE', string> = {
  VERT: 'Suivi cible : conforme',
  ORANGE: 'Suivi cible : vigilance',
  ROUGE: 'Suivi cible : alerte',
};

export function CheckpointHealthBadge({ health, compact }: { health?: CheckpointHealth; compact?: boolean }) {
  if (!health?.level) return null;
  // On space-constrained cards (Kanban/liste), only surface something to
  // act on — a healthy dossier doesn't need a dot cluttering every card.
  if (compact && health.level === 'VERT') return null;
  const title = health.reasons.length ? `${CHECKPOINT_HEALTH_LABEL[health.level]} — ${health.reasons.join(' · ')}` : CHECKPOINT_HEALTH_LABEL[health.level];

  if (compact) {
    return (
      <span
        title={title}
        className={cn(
          'inline-block h-2 w-2 shrink-0 rounded-full',
          health.level === 'ORANGE' && 'bg-warning',
          health.level === 'ROUGE' && 'bg-destructive',
        )}
      />
    );
  }

  return (
    <span title={title} className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          health.level === 'VERT' && 'bg-success',
          health.level === 'ORANGE' && 'bg-warning',
          health.level === 'ROUGE' && 'bg-destructive',
        )}
      />
      <span
        className={cn(
          health.level === 'VERT' && 'text-success',
          health.level === 'ORANGE' && 'text-warning',
          health.level === 'ROUGE' && 'text-destructive',
        )}
      >
        {CHECKPOINT_HEALTH_LABEL[health.level]}
      </span>
    </span>
  );
}

export function ScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums',
        score >= 70 && 'bg-success/10 text-success',
        score >= 40 && score < 70 && 'bg-warning/10 text-warning',
        score < 40 && 'bg-destructive/10 text-destructive',
      )}
    >
      {score}
    </span>
  );
}
