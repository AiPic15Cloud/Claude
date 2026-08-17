import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TagBadge } from './tag-badge';
import { ScoreBadge, CheckpointHealthBadge } from './deal-badges';
import { formatCurrency } from '@/lib/format';
import type { Deal } from '@/types';
import { cn } from '@/lib/utils';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });

  const progress =
    Number(deal.amountTarget) > 0 ? Math.min(100, Math.round((Number(deal.amountRaised) / Number(deal.amountTarget)) * 100)) : 0;

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn('cursor-pointer touch-none select-none hover:border-primary/40', isDragging && 'z-10 opacity-50 shadow-lg')}
    >
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{deal.name}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <CheckpointHealthBadge health={deal.checkpointHealth} compact />
            <ScoreBadge score={deal.atlasScore} />
          </div>
        </div>

        {deal.city && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {deal.city}
          </p>
        )}

        {(deal.interestRate || deal.durationMonths) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {deal.interestRate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span className="text-foreground">{Number(deal.interestRate).toFixed(2)}%</span>/an
              </span>
            )}
            {deal.durationMonths && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="text-foreground">{deal.durationMonths}</span>mois
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(deal.amountRaised)}</span>
            <span>{formatCurrency(deal.amountTarget)}</span>
          </div>
        </div>

        {deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deal.tags.map(({ tag }) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
