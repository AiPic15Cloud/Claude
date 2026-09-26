import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StageBadge, TypeBadge, RiskScoreBadge, CheckpointHealthBadge, RecoveryStatusBadge, SurveillanceStatusBadge } from '../components/deal-badges';
import { TagBadge } from '../components/tag-badge';
import { formatCurrency } from '@/lib/format';
import { useIsMobile } from '@/lib/use-is-mobile';
import type { Deal } from '@/types';

interface ListViewProps {
  deals: Deal[];
  onSelectDeal: (id: string) => void;
  /** Mobile uniquement : dossiers déjà signalés ailleurs sur l'écran (le bandeau
   * "Nécessite une action") — leur point de statut est tu ici pour que le rouge
   * n'apparaisse jamais à deux endroits à la fois. */
  mutedStatusDealIds?: string[];
}

export function ListView({ deals, onSelectDeal, mutedStatusDealIds }: ListViewProps) {
  const isMobile = useIsMobile();

  if (deals.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Aucune opération ne correspond aux filtres.</p>;
  }

  // Une ligne mobile ne porte que ce qui répond à "de quoi s'agit-il, où,
  // combien" — les autres badges (type, étape, tags, checkpoints…) sont
  // encore un tap plus loin dans la fiche complète. Le point de statut est
  // silencieux si le dossier est sain (même doctrine que SurveillanceStatusBadge
  // compact ailleurs) : sur un écran calme, une couleur qui apparaît veut dire
  // quelque chose.
  if (isMobile) {
    return (
      <div className="flex flex-col">
        {deals.map((deal) => (
          <button
            key={deal.id}
            onClick={() => onSelectDeal(deal.id)}
            className="flex items-center gap-3 border-b border-border/60 py-5 text-left last:border-b-0"
          >
            <SurveillanceStatusBadge status={mutedStatusDealIds?.includes(deal.id) ? null : deal.surveillanceStatus} compact />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{deal.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[deal.city, formatCurrency(deal.amountTarget)].filter(Boolean).join(' · ')}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
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
              <RiskScoreBadge score={deal.riskScore} previousScore={deal.riskScorePrevious} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{deal.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{deal.reference}</span>
                  <CheckpointHealthBadge health={deal.checkpointHealth} compact />
                  <RecoveryStatusBadge status={deal.recoveryStatus} compact />
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
                <Progress value={progress} className="h-1" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
