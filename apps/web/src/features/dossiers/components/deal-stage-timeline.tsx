import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { useDealActivities } from '../hooks/use-activities';
import { DEAL_STAGES, DEAL_STAGE_LABELS, type DealStage } from '@/types';

function extractTargetStage(message: string): DealStage | null {
  const match = message.match(/→\s*(\w+)\s*$/);
  const candidate = match?.[1];
  return candidate && (DEAL_STAGES as string[]).includes(candidate) ? (candidate as DealStage) : null;
}

interface DealStageTimelineProps {
  dealId: string;
  currentStage: DealStage;
}

/**
 * Vraie progression des 9 étapes ATLAS (pas le cycle de vie de l'actif
 * immobilier — aucune date de PC/travaux/commercialisation n'existe dans le
 * schéma). Les dates de transition sont extraites du journal d'activité
 * (STAGE_CHANGED déjà loggé à chaque changement d'étape) plutôt
 * qu'inventées.
 */
export function DealStageTimeline({ dealId, currentStage }: DealStageTimelineProps) {
  const { data: activities, isLoading } = useDealActivities(dealId);

  if (isLoading || !activities) return null;

  const chronological = [...activities].reverse();
  const stageDates = new Map<DealStage, string>();
  for (const activity of chronological) {
    if (activity.type === 'DEAL_CREATED' && !stageDates.has('SOURCING')) {
      stageDates.set('SOURCING', activity.createdAt);
    }
    if (activity.type === 'STAGE_CHANGED') {
      const target = extractTargetStage(activity.message);
      if (target) stageDates.set(target, activity.createdAt);
    }
  }

  const currentIndex = DEAL_STAGES.indexOf(currentStage);

  return (
    <div className="flex items-start overflow-x-auto rounded-lg border border-border bg-card px-4 py-4">
      {DEAL_STAGES.map((stage, i) => {
        const reached = i <= currentIndex;
        const isCurrent = stage === currentStage;
        const date = stageDates.get(stage);
        return (
          <Fragment key={stage}>
            {i > 0 && <div className={cn('mt-1.5 h-px w-6 shrink-0 sm:w-10', reached ? 'bg-primary' : 'bg-border')} />}
            <div className="flex min-w-[4.5rem] flex-col items-center gap-1 text-center">
              <span
                className={cn(
                  'h-3 w-3 shrink-0 rounded-full border-2',
                  isCurrent && 'border-primary bg-primary',
                  reached && !isCurrent && 'border-primary bg-primary/30',
                  !reached && 'border-border bg-transparent',
                )}
              />
              <span className={cn('text-[11px] font-medium', isCurrent ? 'text-primary' : reached ? 'text-foreground' : 'text-muted-foreground')}>
                {DEAL_STAGE_LABELS[stage]}
              </span>
              <span className="text-[10px] text-muted-foreground">{date ? formatDate(date) : '—'}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
