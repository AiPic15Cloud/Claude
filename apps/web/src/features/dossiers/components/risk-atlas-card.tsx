import { useState } from 'react';
import { Loader2, RefreshCw, TrendingDown, TrendingUp, Minus, ShieldAlert, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useDealRisk, useRecomputeRisk, useRiskHistory, useSetAnalystOverride, useClearAnalystOverride } from '../hooks/use-risk';
import { RiskMethodologySheet } from './risk-methodology-sheet';
import { RiskTrajectoryChart } from './risk-trajectory-chart';
import { SurveillanceStatusBadge } from '@/features/portfolio/components/deal-badges';
import { DEAL_SURVEILLANCE_STATUS_LABELS, type DealSurveillanceStatus } from '@/types';
import { formatDate } from '@/lib/format';

// Sub-scores structurels/de performance : haut = mieux, comme scoreColor.
function scoreColor(value: number): string {
  if (value >= 70) return 'bg-success';
  if (value >= 40) return 'bg-warning';
  return 'bg-destructive';
}

function SubScore({ label, info, value }: { label: string; info: string; value: number | undefined | null }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {label}
          <InfoTooltip text={info} />
        </span>
        <span className="font-medium tabular-nums">{value ?? '—'}</span>
      </div>
      <Progress value={value ?? 0} className="h-1.5" indicatorClassName={value === null || value === undefined ? 'bg-muted' : scoreColor(value)} />
    </div>
  );
}

const TREND_ICON = { UP: TrendingUp, DOWN: TrendingDown, FLAT: Minus } as const;

function DeltaBadge({ label, info, value }: { label: string; info: string; value: number | null }) {
  if (value === null) return null;
  // Composite : haut = pire, donc une hausse est une dégradation.
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = value > 0 ? 'text-destructive' : value < 0 ? 'text-success' : 'text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs tabular-nums ${color}`}>
      <Icon className="h-3 w-3" />
      {label} {value > 0 ? '+' : ''}
      {value}
      <InfoTooltip text={info} />
    </span>
  );
}

const STATUS_OPTIONS: DealSurveillanceStatus[] = ['FAIBLE', 'SOUS_SURVEILLANCE', 'ELEVE', 'CRITIQUE'];

function AnalystOverrideDialog({ dealId, currentStatus, open, onOpenChange }: { dealId: string; currentStatus: DealSurveillanceStatus | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [status, setStatus] = useState<DealSurveillanceStatus | ''>('');
  const [justification, setJustification] = useState('');
  const setOverride = useSetAnalystOverride(dealId);

  const handleSubmit = () => {
    if (!status || justification.trim().length === 0) return;
    setOverride.mutate(
      { overrideStatus: status, justification: justification.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setStatus('');
          setJustification('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forcer le statut de surveillance</DialogTitle>
          <DialogDescription>
            Le statut choisi restera figé jusqu'à ce que vous leviez explicitement cet override — le moteur ne l'écrasera jamais silencieusement.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Select value={status} onValueChange={(v) => setStatus(v as DealSurveillanceStatus)}>
            <SelectTrigger>
              <SelectValue placeholder={currentStatus ? `Statut calculé : ${DEAL_SURVEILLANCE_STATUS_LABELS[currentStatus]}` : 'Choisir un statut'} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {DEAL_SURVEILLANCE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Justification (obligatoire)"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
          />
          {setOverride.error && <p className="text-xs text-destructive">{setOverride.error.message}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!status || justification.trim().length === 0 || setOverride.isPending}>
            {setOverride.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RiskAtlasCard({ dealId }: { dealId: string }) {
  const { data, isLoading } = useDealRisk(dealId);
  const recompute = useRecomputeRisk(dealId);
  const { data: history, isLoading: historyLoading } = useRiskHistory(dealId);
  const clearOverride = useClearAnalystOverride(dealId);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.suppressed || data.composite.score === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risque ATLAS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Dossier clos — non noté.</p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = data.composite.trend ? TREND_ICON[data.composite.trend] : Minus;
  const analystOverride = data.surveillance.analystOverride;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <CardTitle>Risque ATLAS</CardTitle>
            {data.surveillance.status && <SurveillanceStatusBadge status={data.surveillance.status} />}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold tabular-nums">{data.composite.score}/100</p>
            <TrendIcon className="h-4 w-4 text-muted-foreground" />
            <DeltaBadge
              label="Δ90j"
              info="Variation du score composite de risque sur les 90 derniers jours. Une hausse signale une dégradation, une baisse une amélioration."
              value={data.composite.deltas.d90}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <RiskMethodologySheet />
          <Button variant="outline" size="sm" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
            {recompute.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Recalculer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data.surveillance.hardOverrides.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <ShieldAlert className="h-4 w-4" /> Plancher(s) actif(s)
              <InfoTooltip text="Un plancher (hard override) impose un statut minimum sur des faits objectifs (procédure collective, échéance dépassée, garantie majeure expirée...) qu'aucun bon score ne peut compenser." />
            </div>
            {data.surveillance.hardOverrides.map((o) => (
              <p key={o.ruleKey} className="text-xs text-muted-foreground">
                {o.label} — statut plafonné au minimum à <span className="font-medium">{DEAL_SURVEILLANCE_STATUS_LABELS[o.minimumSurveillanceStatus]}</span> depuis le{' '}
                {formatDate(o.triggeredAt)}
              </p>
            ))}
          </div>
        )}

        {analystOverride && (
          <div className="flex flex-col gap-1.5 rounded-md border border-warning/30 bg-warning/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-medium text-warning">
                <Lock className="h-4 w-4" /> Statut forcé par un analyste
              </div>
              <Button variant="ghost" size="sm" onClick={() => clearOverride.mutate()} disabled={clearOverride.isPending}>
                {clearOverride.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Lever l'override
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {DEAL_SURVEILLANCE_STATUS_LABELS[analystOverride.overrideStatus]} — {analystOverride.justification}
              <br />
              par {analystOverride.createdByName} le {formatDate(analystOverride.createdAt)} (statut calculé alors :{' '}
              {data.surveillance.automaticStatus ? DEAL_SURVEILLANCE_STATUS_LABELS[data.surveillance.automaticStatus] : '—'})
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <SubScore
            label="Quality"
            info="Qualité structurelle du dossier : marge, ratios de financement (LTC/LTV), dépendance bancaire, garanties. Relativement stable dans le temps — plus haut est mieux."
            value={data.quality?.score}
          />
          <SubScore
            label="Performance"
            info="Écart entre le réel et le business plan initial : marge à date, suivi chantier/commercialisation, prix de vente actualisé. Plus haut est mieux."
            value={data.performance?.score}
          />
          <SubScore
            label="EWS"
            info="Early Warning Score — signaux d'alerte précoce cumulés (retards, dégradations, situation juridique...). Contrairement aux deux autres scores, plus haut est pire ici."
            value={data.ews?.score}
          />
        </div>

        {data.topContributors.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Principaux facteurs</p>
            {data.topContributors.slice(0, 5).map((c, i) => (
              <div key={`${c.source}-${i}`} className="flex items-center justify-between text-xs">
                <span>{c.label}</span>
                <span className={`font-medium tabular-nums ${c.points > 0 ? 'text-destructive' : c.points < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                  {c.points > 0 ? '+' : ''}
                  {c.points} pts
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Trajectoire (90j)</p>
          <RiskTrajectoryChart history={history ?? []} isLoading={historyLoading} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              Cycle : {data.cycleProjet}
              <InfoTooltip text="Étape du cycle de vie du financement (en cours, sortie, remboursement, clôturé) — indépendant du statut de surveillance et de la situation juridique." />
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              Vélocité : {data.surveillance.velocity ? data.surveillance.velocity.band : '—'}
              <InfoTooltip text="Vitesse de dégradation ou d'amélioration du score composite sur 90 jours. Une détérioration rapide pèse plus lourd qu'un risque stable, même à score égal." />
            </span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => setOverrideDialogOpen(true)}>
            Forcer le statut
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{data.disclaimer}</p>
      </CardContent>
      <AnalystOverrideDialog dealId={dealId} currentStatus={data.surveillance.status} open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen} />
    </Card>
  );
}
