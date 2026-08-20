import { Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
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
 * BP initial vs actualisé — reconstruit depuis l'historique des valeurs
 * (FieldChange), pas un snapshot dédié. La dérive par rapport à l'objectif
 * initial est souvent plus informative que la valeur actuelle seule.
 */
export function BpComparisonCard({ comparison }: { comparison: BpComparison }) {
  if (!comparison.hasData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>BP initial vs actualisé</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!comparison.hasAnyHistory ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Aucun historique de modification pour ce dossier — les colonnes initial/actualisé seront identiques tant qu'aucun champ n'a été modifié
            depuis la première saisie.
          </p>
        ) : (
          <>
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
            {comparison.earliestChangeAt && (
              <p className="text-[11px] text-muted-foreground">Historique disponible depuis le {formatDate(comparison.earliestChangeAt)}.</p>
            )}
          </>
        )}
        {comparison.disclaimer && <p className="text-[11px] text-muted-foreground">{comparison.disclaimer}</p>}
      </CardContent>
    </Card>
  );
}
