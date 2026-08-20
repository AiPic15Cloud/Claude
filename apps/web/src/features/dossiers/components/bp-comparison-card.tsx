import { Fragment, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLockBaseline } from '../hooks/use-financial-model';
import type { BpComparison, BpComparisonLine } from '@/types';

function formatEuro(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function DeltaBadge({ line }: { line: BpComparisonLine }) {
  if (line.deltaAbs === 0) {
    return <span className="text-xs text-muted-foreground">sans changement</span>;
  }
  const isMargin = line.key === 'marge';
  // Pour la marge, une hausse est positive ; pour un poste de coût, une hausse est négative.
  const isGood = isMargin ? line.deltaAbs > 0 : line.deltaAbs < 0;
  const sign = line.deltaAbs > 0 ? '+' : '';
  const pctText = line.deltaPct !== null ? ` (${line.deltaPct > 0 ? '+' : ''}${line.deltaPct}%)` : '';
  return (
    <span className={cn('text-xs font-medium tabular-nums', isGood ? 'text-success' : 'text-destructive')}>
      {sign}
      {formatEuro(line.deltaAbs)}
      {pctText}
    </span>
  );
}

/**
 * BP initial vs actualisé — comparé à un instantané figé explicitement par
 * l'utilisateur (bouton "Figer le BP initial") une fois sa saisie terminée,
 * plutôt que reconstruit depuis la première sauvegarde (qui pouvait être
 * partielle et faire apparaître un écart fictif dès qu'un champ encore vide
 * était rempli plus tard).
 */
export function BpComparisonCard({ dealId, comparison }: { dealId: string; comparison: BpComparison }) {
  const lockBaseline = useLockBaseline(dealId);
  const [confirmingRelock, setConfirmingRelock] = useState(false);

  if (!comparison.hasData) return null;

  if (!comparison.locked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>BP initial vs actualisé</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{comparison.disclaimer}</p>
          <Button type="button" size="sm" className="self-start" onClick={() => lockBaseline.mutate()} disabled={lockBaseline.isPending}>
            {lockBaseline.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Figer le BP initial
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleRelock = () => {
    if (!confirmingRelock) {
      setConfirmingRelock(true);
      return;
    }
    lockBaseline.mutate(undefined, { onSuccess: () => setConfirmingRelock(false) });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>BP initial vs actualisé</CardTitle>
        <div className="flex items-center gap-2">
          {confirmingRelock && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingRelock(false)}>
              Annuler
            </Button>
          )}
          <Button type="button" size="sm" variant={confirmingRelock ? 'destructive' : 'ghost'} onClick={handleRelock} disabled={lockBaseline.isPending}>
            {lockBaseline.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            {confirmingRelock ? 'Confirmer — redémarrer à partir de maintenant' : 'Refiger'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Poste</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Initial</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actualisé</span>
          <span className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Écart</span>
          {comparison.lines.map((line) => (
            <Fragment key={line.key}>
              <span className={line.key === 'coutDeRevient' || line.key === 'marge' ? 'font-medium' : 'text-muted-foreground'}>{line.label}</span>
              <span className="tabular-nums">
                {formatEuro(line.initial)}
                {line.initialPct !== undefined && <span className="text-muted-foreground"> ({line.initialPct}%)</span>}
              </span>
              <span className="tabular-nums">
                {formatEuro(line.current)}
                {line.currentPct !== undefined && <span className="text-muted-foreground"> ({line.currentPct}%)</span>}
              </span>
              <span className="text-right">
                <DeltaBadge line={line} />
              </span>
            </Fragment>
          ))}
        </div>
        {comparison.disclaimer && <p className="text-[11px] text-muted-foreground">{comparison.disclaimer}</p>}
      </CardContent>
    </Card>
  );
}
