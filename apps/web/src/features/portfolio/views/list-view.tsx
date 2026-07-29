import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StageBadge, TypeBadge, ScoreBadge, CheckpointHealthBadge } from '../components/deal-badges';
import { TagBadge } from '../components/tag-badge';
import { formatCurrency } from '@/lib/format';
import type { Deal } from '@/types';

interface ListViewProps {
  deals: Deal[];
  onSelectDeal: (id: string) => void;
}

export function ListView({ deals, onSelectDeal }: ListViewProps) {
  if (deals.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Aucune opération ne correspond aux filtres.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {deals.map((deal) => {
        const progress =
          Number(deal.amountTarget) > 0 ? Math.min(100, Math.round((Number(deal.amountRaised) / Number(deal.amountTarget)) * 100)) : 0;
        return (
          <Card
            key={deal.id}
            onClick={() => onSelectDeal(deal.id)}
            className="cursor-pointer transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-4 p-3.5">
              <ScoreBadge score={deal.atlasScore} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{deal.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{deal.reference}</span>
                  <CheckpointHealthBadge health={deal.checkpointHealth} compact />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {deal.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {deal.city}
                    </span>
                  )}
                  {deal.tags.slice(0, 3).map(({ tag }) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
              </div>

              <TypeBadge type={deal.type} />
              <StageBadge stage={deal.stage} />

              <div className="hidden w-40 flex-col items-end gap-1 sm:flex">
                <span className="text-sm font-medium tabular-nums">{formatCurrency(deal.amountTarget)}</span>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
