import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StageBadge, TypeBadge, RiskScoreBadge, CheckpointHealthBadge, RecoveryStatusBadge, SurveillanceStatusBadge } from '../components/deal-badges';
import { TagBadge } from '../components/tag-badge';
import { formatCurrency } from '@/lib/format';
import { useIsMobile } from '@/lib/use-is-mobile';
import { DEAL_STAGES, DEAL_STAGE_LABELS, type Deal } from '@/types';

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
  // combien" — les autres badges (type, tags, checkpoints…) sont encore un
  // tap plus loin dans la fiche complète. Le point de statut est silencieux
  // si le dossier est sain (même doctrine que SurveillanceStatusBadge
  // compact ailleurs) : sur un écran calme, une couleur qui apparaît veut
  // dire quelque chose. L'étape, elle, ne se lit pas dossier par dossier
  // (ce serait un badge concurrent sur chaque ligne) mais par un
  // regroupement de la liste elle-même — retour utilisateur direct : une
  // liste plate mélangeant sourcing et remboursé ne permet pas de distinguer
  // le niveau d'avancement d'un coup d'œil. Groupes vides omis plutôt
  // qu'affichés à zéro (même doctrine que le bandeau "Nécessite une action").
  if (isMobile) {
    const grouped = DEAL_STAGES.map((stage) => ({ stage, stageDeals: deals.filter((d) => d.stage === stage) })).filter(
      (g) => g.stageDeals.length > 0,
    );

    return (
      <div className="flex flex-col">
        {grouped.map(({ stage, stageDeals }, index) => (
          <div key={stage} className={index === 0 ? 'pt-0' : 'pt-6'}>
            <div className="flex items-baseline justify-between pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {DEAL_STAGE_LABELS[stage]}
              </p>
              <p className="text-[11px] text-muted-foreground">{stageDeals.length}</p>
            </div>
            {stageDeals.map((deal) => (
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
