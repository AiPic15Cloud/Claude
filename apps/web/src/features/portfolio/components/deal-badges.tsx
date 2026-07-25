import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DEAL_STAGE_LABELS, DEAL_TYPE_LABELS, type DealStage, type DealType } from '@/types';

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
