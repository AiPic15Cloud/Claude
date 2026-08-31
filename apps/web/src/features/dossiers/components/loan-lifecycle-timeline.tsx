import { CheckCircle2, Scale, XCircle } from 'lucide-react';
import { useLoanLifecycle } from '../hooks/use-loan-lifecycle';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LoanLifecycleSegment, LoanLifecycleSegmentKind, LoanLifecycleTerminalType } from '@/types';

const SEGMENT_LABEL: Record<LoanLifecycleSegmentKind, string> = {
  NORMAL: 'En cours normal',
  DEPASSEMENT: 'Durée cible dépassée',
  HORS_CONTRAT: 'Hors contrat (rattrapage)',
  PROROGE: 'Prorogé',
};

// Couleur + motif distincts par segment (jamais la teinte seule — daltonisme,
// export N&B) : chaque kind a sa propre texture en plus de sa couleur, y
// compris DEPASSEMENT vs PROROGE qui partagent l'orange dans la spec.
const SEGMENT_STYLE: Record<LoanLifecycleSegmentKind, string> = {
  NORMAL: 'bg-success',
  DEPASSEMENT: 'bg-warning bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.18)_3px,rgba(0,0,0,0.18)_5px)]',
  HORS_CONTRAT: 'bg-destructive bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.35)_2px,rgba(255,255,255,0.35)_3px)]',
  PROROGE: 'bg-warning bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(0,0,0,0.18)_3px,rgba(0,0,0,0.18)_5px)]',
};

const TERMINAL_ICON: Record<LoanLifecycleTerminalType, typeof CheckCircle2> = {
  REMBOURSE: CheckCircle2,
  DEFAUT: XCircle,
  PROCEDURE_COLLECTIVE: Scale,
};

const TERMINAL_LABEL: Record<LoanLifecycleTerminalType, string> = {
  REMBOURSE: 'Remboursé le',
  DEFAUT: 'Défaut constaté le',
  PROCEDURE_COLLECTIVE: 'Procédure collective ouverte le',
};

const TERMINAL_CLASS: Record<LoanLifecycleTerminalType, string> = {
  REMBOURSE: 'text-success',
  DEFAUT: 'text-destructive',
  PROCEDURE_COLLECTIVE: 'text-destructive',
};

function SegmentBar({ segments, compact }: { segments: LoanLifecycleSegment[]; compact: boolean }) {
  return (
    <div className={cn('flex w-full overflow-hidden rounded-full', compact ? 'h-1.5' : 'h-3')}>
      {segments.map((s, i) => (
        <div
          key={i}
          title={`${SEGMENT_LABEL[s.kind]} — ${formatDate(s.start)} → ${formatDate(s.end)}`}
          className={cn('flex-1', SEGMENT_STYLE[s.kind], i > 0 && 'ml-px')}
        />
      ))}
    </div>
  );
}

interface LoanLifecycleTimelineProps {
  dealId: string;
  variant?: 'full' | 'sparkline';
}

/**
 * Frise du cycle de vie du prêt (spec ATLAS v2, A.3bis). Échelle
 * proportionnelle par segment (largeur égale par phase), pas chronométrique
 * — un dossier de 6 mois et un dossier de 3 ans restent également lisibles ;
 * les dates exactes sont dans le titre au survol de chaque segment. Comme le
 * calcul serveur (loan-lifecycle.util.ts) prolonge toujours le dernier
 * segment jusqu'à "aujourd'hui" tant qu'aucun événement terminal n'est
 * connu, le curseur du jour est simplement la fin de la barre — pas besoin
 * de le positionner à l'intérieur, ce qui serait de toute façon incohérent
 * avec une largeur non chronométrique.
 */
export function LoanLifecycleTimeline({ dealId, variant = 'full' }: LoanLifecycleTimelineProps) {
  const { data, isLoading } = useLoanLifecycle(dealId);
  const compact = variant === 'sparkline';

  if (isLoading || !data) {
    return compact ? <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" /> : null;
  }

  if (data.status === 'INSUFFICIENT_DATA') {
    return compact ? null : (
      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-center text-xs text-muted-foreground">
        Données insuffisantes pour la frise (date de déblocage, durée ou échéance manquante).
      </div>
    );
  }

  const TerminalIcon = data.terminal ? TERMINAL_ICON[data.terminal.type] : null;

  return (
    <div className={cn('flex flex-col gap-1.5', !compact && 'rounded-lg border border-border bg-card px-4 py-3')}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SegmentBar segments={data.segments} compact={compact} />
        </div>
        {TerminalIcon && (
          <TerminalIcon
            className={cn('h-4 w-4 shrink-0', TERMINAL_CLASS[data.terminal!.type])}
            aria-label={`${TERMINAL_LABEL[data.terminal!.type]} ${formatDate(data.terminal!.date)}`}
          />
        )}
        {!data.terminal && !compact && (
          <span title="Aujourd'hui" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-foreground" />
        )}
        <span className={cn('shrink-0 whitespace-nowrap text-xs font-medium tabular-nums', data.retardDays > 0 ? 'text-warning' : 'text-muted-foreground')}>
          {data.retardDays > 0 ? `+${data.retardDays} j vs durée cible` : 'Dans la durée cible'}
        </span>
      </div>

      {!compact && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Durée cible : {formatDate(data.dateDureeCible)}</span>
          {data.terminal ? (
            <span className={TERMINAL_CLASS[data.terminal.type]}>
              {TERMINAL_LABEL[data.terminal.type]} {formatDate(data.terminal.date)}
            </span>
          ) : (
            <span>Aujourd'hui</span>
          )}
        </div>
      )}
    </div>
  );
}
