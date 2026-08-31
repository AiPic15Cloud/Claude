import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';
import {
  DEAL_RECOVERY_STATUS_DESCRIPTIONS,
  DEAL_RECOVERY_STATUS_LABELS,
  DEAL_STAGE_LABELS,
  DEAL_SURVEILLANCE_STATUS_DESCRIPTIONS,
  DEAL_SURVEILLANCE_STATUS_LABELS,
  DEAL_TYPE_LABELS,
  type CheckpointHealth,
  type DealRecoveryStatus,
  type DealStage,
  type DealSurveillanceStatus,
  type DealType,
} from '@/types';

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

export function RepaidBadge({ repaid, stage }: { repaid: boolean; stage?: DealStage }) {
  // Une étape terminale (REMBOURSE/DEFAUT) est déjà portée par StageBadge —
  // afficher aussi "En cours" à côté serait trompeur (dossiers importés
  // avant que DealsService.update() ne synchronise stage et repaid), et
  // répéter "Remboursé" deux fois serait redondant. On laisse StageBadge
  // seul porter l'information dans ce cas.
  if (stage === 'REMBOURSE' || stage === 'DEFAUT') return null;
  return <Badge variant={repaid ? 'success' : 'outline'}>{repaid ? 'Remboursé' : 'En cours'}</Badge>;
}

const RECOVERY_STATUS_VARIANT: Record<DealRecoveryStatus, 'success' | 'warning' | 'destructive'> = {
  RAS: 'success',
  AMIABLE: 'warning',
  MISE_EN_DEMEURE: 'destructive',
  CONTENTIEUX: 'destructive',
  PROCEDURE_COLLECTIVE: 'destructive',
};

export function RecoveryStatusBadge({ status, compact }: { status: DealRecoveryStatus; compact?: boolean }) {
  // Same "don't clutter a healthy card" convention as CheckpointHealthBadge.
  if (compact && status === 'RAS') return null;
  if (compact) {
    return (
      <span
        title={DEAL_RECOVERY_STATUS_DESCRIPTIONS[status]}
        className={cn(
          'inline-block h-2 w-2 shrink-0 rounded-full',
          status === 'AMIABLE' && 'bg-warning',
          (status === 'MISE_EN_DEMEURE' || status === 'CONTENTIEUX' || status === 'PROCEDURE_COLLECTIVE') && 'bg-destructive',
        )}
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant={RECOVERY_STATUS_VARIANT[status]}>{DEAL_RECOVERY_STATUS_LABELS[status]}</Badge>
      <InfoTooltip text={DEAL_RECOVERY_STATUS_DESCRIPTIONS[status]} />
    </span>
  );
}

const SURVEILLANCE_STATUS_VARIANT: Record<DealSurveillanceStatus, 'success' | 'warning' | 'destructive'> = {
  FAIBLE: 'success',
  SOUS_SURVEILLANCE: 'warning',
  ELEVE: 'warning',
  CRITIQUE: 'destructive',
};

/** Statut de surveillance ATLAS (Risk Engine v2) — remplace à terme la seule lecture de RiskScoreBadge sur les vues portefeuille. */
export function SurveillanceStatusBadge({ status, compact }: { status?: DealSurveillanceStatus | null; compact?: boolean }) {
  if (!status) return compact ? null : <span className="text-xs text-muted-foreground">—</span>;
  if (compact && status === 'FAIBLE') return null;
  if (compact) {
    return (
      <span
        title={DEAL_SURVEILLANCE_STATUS_DESCRIPTIONS[status]}
        className={cn(
          'inline-block h-2 w-2 shrink-0 rounded-full',
          status === 'SOUS_SURVEILLANCE' || status === 'ELEVE' ? 'bg-warning' : 'bg-destructive',
        )}
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant={SURVEILLANCE_STATUS_VARIANT[status]}>{DEAL_SURVEILLANCE_STATUS_LABELS[status]}</Badge>
      <InfoTooltip text={DEAL_SURVEILLANCE_STATUS_DESCRIPTIONS[status]} />
    </span>
  );
}

/** Surveillance quotidienne du SIREN du porteur (voir CompanyMonitoringService) — silencieux tant que tout va bien. */
export function PorteurMonitoringBadge({ status }: { status?: string | null }) {
  if (status === 'procedure_collective') return <Badge variant="destructive">Procédure collective</Badge>;
  if (status === 'fermee') return <Badge variant="destructive">Société fermée</Badge>;
  return null;
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

/** Risk Engine — score de risque (haut = mauvais), seuils 40/70. */
export function RiskScoreBadge({ score, previousScore }: { score?: number | null; previousScore?: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  const TrendIcon = previousScore === null || previousScore === undefined || previousScore === score ? Minus : previousScore < score ? TrendingUp : TrendingDown;
  return (
    <span
      title="Score de risque ATLAS (Risk Engine)"
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-md px-1.5 text-xs font-semibold tabular-nums',
        score >= 70 && 'bg-destructive/10 text-destructive',
        score >= 40 && score < 70 && 'bg-warning/10 text-warning',
        score < 40 && 'bg-success/10 text-success',
      )}
    >
      {score}
      <TrendIcon className="h-3 w-3" />
    </span>
  );
}
