import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { SurveillanceStatusBadge } from '@/features/portfolio/components/deal-badges';
import { ValidationBadge } from './validation-badge';
import { useDealRisk } from '../hooks/use-risk';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DEAL_RECOVERY_STATUS_LABELS, type Deal, type Guarantee, type Task } from '@/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CYCLE_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  SORTIE: 'Sortie',
  REMBOURSEMENT: 'Remboursement',
  CLOTURE: 'Clôturé',
};

const TREND_ICON = { UP: TrendingUp, DOWN: TrendingDown, FLAT: Minus } as const;

interface ProjectCommandHeaderProps {
  deal: Deal;
  guaranteeWarnings: Guarantee[];
  tasks: Task[];
  onOpenTasks: () => void;
}

/**
 * Header condensé de fiche projet (brief "Le Traçotin", section 3) : répond
 * dans l'ordre à "quelle est la situation, combien est exposé, pourquoi,
 * sommes-nous protégés, que doit-on faire, pour quand/par qui" — remplace
 * l'ancienne dispersion (ScoreBadge/RiskScoreBadge dans la rangée de boutons +
 * 3 bandeaux d'alerte au même niveau visuel). "Recovery : non évalué" et le
 * décompte d'informations manquantes viennent de données réellement calculées
 * (DataValidation, RiskEngine.completeness), jamais d'un texte figé.
 */
export function ProjectCommandHeader({ deal, guaranteeWarnings, tasks, onOpenTasks }: ProjectCommandHeaderProps) {
  const { data, isLoading } = useDealRisk(deal.id);

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.suppressed || data.composite.score === null) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">Dossier clos — non surveillé.</CardContent>
      </Card>
    );
  }

  const status = data.surveillance.status;
  const toneClass =
    status === 'CRITIQUE'
      ? 'border-destructive/30 bg-destructive/5'
      : status === 'ELEVE' || status === 'SOUS_SURVEILLANCE'
        ? 'border-warning/30 bg-warning/5'
        : 'border-success/30 bg-success/5';

  const TrendIcon = data.composite.trend ? TREND_ICON[data.composite.trend] : Minus;

  const openTasks = tasks.filter((t) => !t.done);
  const urgentTasks = openTasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH');
  const nextTask = [...openTasks].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  })[0];

  return (
    <Card className={cn('border', toneClass)}>
      <CardContent className="flex flex-col gap-2.5 p-4 text-sm">
        {/* 1. Situation */}
        <div className="flex flex-wrap items-center gap-2">
          {status && <SurveillanceStatusBadge status={status} />}
          <span className="text-lg font-semibold tabular-nums">{data.composite.score}/100</span>
          <TrendIcon className="h-4 w-4 text-muted-foreground" />
          {data.composite.deltas.d90 !== null && (
            <span className="text-xs text-muted-foreground">
              Δ90j {data.composite.deltas.d90 > 0 ? '+' : ''}
              {data.composite.deltas.d90}
            </span>
          )}
          <span className="text-muted-foreground/50">·</span>
          <span className="text-xs text-muted-foreground">Score ATLAS {deal.atlasScore ?? '—'}/100</span>
        </div>

        {/* 2. Exposition + statuts fusionnés */}
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{formatCurrency(deal.crd ?? Number(deal.amountRaised))} exposés</span>
          {' · '}Cycle : {CYCLE_LABELS[data.cycleProjet]}
          {' · '}Recouvrement : {deal.recoveryStatus ? DEAL_RECOVERY_STATUS_LABELS[deal.recoveryStatus] : '—'}
        </p>

        {/* 3. Pourquoi */}
        {data.triggered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pourquoi : </span>
            {data.triggered.slice(0, 2).map((t) => t.label).join(' · ')}
          </p>
        )}

        {/* 4. Protection */}
        {(data.guaranteeProtection || guaranteeWarnings.length > 0) && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Protection : </span>
            {data.guaranteeProtection}
            {guaranteeWarnings.length > 0 && ` · ${guaranteeWarnings.length} sûreté(s) à revoir`}
          </p>
        )}

        {/* 5. Recovery — uniquement en CRITIQUE */}
        {status === 'CRITIQUE' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">Recovery :</span>
            <ValidationBadge dealId={deal.id} entityType="Recovery" />
          </div>
        )}

        {/* 6. Complétude */}
        {data.completeness && data.completeness.missingCount > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {data.completeness.missingCount} information(s) critique(s) manquante(s)
            <InfoTooltip text={data.completeness.missingItems.map((i) => i.label).join(' · ')} />
          </p>
        )}

        {/* 7. Action / échéance */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
          <p className="text-xs text-muted-foreground">
            {nextTask ? (
              <>
                <span className="font-medium text-foreground">Prochaine tâche : </span>
                {nextTask.title}
                {nextTask.dueDate && ` (${formatDate(nextTask.dueDate)})`}
              </>
            ) : (
              'Aucune tâche ouverte.'
            )}
            {openTasks.length > 0 && ` · ${openTasks.length} ouverte(s)`}
            {urgentTasks.length > 0 && ` · ${urgentTasks.length} urgente(s)`}
          </p>
          {tasks.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onOpenTasks}>
              Voir les tâches →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
