import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TagBadge } from './tag-badge';
import { SurveillanceStatusBadge } from './deal-badges';
import { LoanLifecycleTimeline } from '@/features/dossiers/components/loan-lifecycle-timeline';
import { isFinancedStage, type Deal } from '@/types';
import { cn } from '@/lib/utils';

const MAX_VISIBLE_TAGS = 2;

// Notation compacte forcée pour les deux bornes de la collecte — formatCurrency()
// bascule seul en compact au-delà de 1M, donc un montant collecté encore petit
// ("0,00 €") s'affichait à côté d'un objectif abrégé ("2 M €") sans cohérence.
function formatFundingAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });

  const target = Number(deal.amountTarget);
  const raised = Number(deal.amountRaised);
  const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-pointer touch-none select-none transition-transform duration-300 ease-premium hover:-translate-y-0.5 hover:border-primary/40',
        isDragging && 'z-10 opacity-50 shadow-lg',
      )}
    >
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{deal.name}</p>
          {/* Un seul signal de risque, silencieux si le dossier est sain (FAIBLE) — plutôt que 3 badges numériques concurrents. */}
          <SurveillanceStatusBadge status={deal.surveillanceStatus} compact />
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {deal.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {deal.city}
            </span>
          )}
          {(deal.interestRate || deal.durationMonths) && (
            <span>
              {deal.interestRate && `${Number(deal.interestRate).toFixed(2)}%/an`}
              {deal.interestRate && deal.durationMonths && ' · '}
              {deal.durationMonths && `${deal.durationMonths} mois`}
            </span>
          )}
        </p>

        {/* Avant le début de la collecte, "0 € collectés" sur chaque carte de Sourcing/Analyse/
            Comité/Montage n'est pas une inconnue à signaler (§Unknown ≠ Zero) — c'est un fait
            attendu à ce stade, donc une barre à 0% ne fait que répéter l'évidence sur la
            majorité des cartes. On ne l'affiche qu'une fois la collecte réellement engagée. */}
        {raised > 0 ? (
          <div className="flex flex-col gap-1">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatFundingAmount(raised)} collectés</span>
              <span>{progress} % de {formatFundingAmount(target)}</span>
            </div>
          </div>
        ) : (
          target > 0 && <p className="text-xs text-muted-foreground">Objectif : {formatFundingAmount(target)}</p>
        )}

        {isFinancedStage(deal.stage) && <LoanLifecycleTimeline dealId={deal.id} variant="sparkline" />}

        {deal.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {deal.tags.slice(0, MAX_VISIBLE_TAGS).map(({ tag }) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
            {deal.tags.length > MAX_VISIBLE_TAGS && (
              <span className="text-[11px] text-muted-foreground">+{deal.tags.length - MAX_VISIBLE_TAGS}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
