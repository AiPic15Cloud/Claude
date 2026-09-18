import { Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { usePrequalStressTests } from '../hooks/use-prequalification';
import { PREQUAL_STRESS_CAPACITY_LABELS, type PrequalStressCapacity } from '@/types';

function capacityBadge(capacity: PrequalStressCapacity) {
  const variant = capacity === 'OK' ? 'success' : capacity === 'TENDUE' ? 'outline' : capacity === 'INSUFFISANTE' ? 'destructive' : 'outline';
  return <Badge variant={variant}>{PREQUAL_STRESS_CAPACITY_LABELS[capacity]}</Badge>;
}

function pct(value: number | null): string {
  return value != null ? `${value.toFixed(1)} %` : '—';
}

/**
 * Stress tests (spec §11) — registre fermé de 9 familles de scénarios
 * standards, chacun recalculé depuis le bilan financier actuel (jamais un
 * second moteur de marge parallèle). Un scénario non applicable (ex. pas de
 * médiane de marché, pas de situation d'acquisition conditionnelle) affiche
 * la raison plutôt qu'une valeur inventée.
 */
export function StressTestsTab({ caseId }: { caseId: string }) {
  const { data: scenarios, isLoading } = usePrequalStressTests(caseId);

  if (isLoading) return null;

  if (!scenarios || scenarios.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Renseignez le bilan financier (onglet Financier) pour calculer les stress tests.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Stress tests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1.6fr_repeat(5,1fr)] items-start gap-x-3 gap-y-3 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scénario</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Marge (€)</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Marge sur CA</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Besoin complémentaire</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">LTC / LTV</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capacité de remboursement</span>

          {scenarios.map((s) => (
            <Fragment key={s.key}>
              <div className="flex flex-col gap-0.5 pr-2">
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.applicable ? s.description : s.unavailableReason}</span>
              </div>
              {s.applicable ? (
                <>
                  <span className={cn('tabular-nums', (s.margeEuros ?? 0) < 0 && 'text-destructive')}>{s.margeEuros != null ? formatCurrency(s.margeEuros) : '—'}</span>
                  <span className="tabular-nums">{pct(s.margePct)}</span>
                  <span className="tabular-nums">{s.besoinComplementaire != null ? formatCurrency(s.besoinComplementaire) : '—'}</span>
                  <span className="tabular-nums">
                    {pct(s.ltcPct)} / {pct(s.ltvPct)}
                  </span>
                  <span>{capacityBadge(s.capaciteRemboursement)}</span>
                </>
              ) : (
                <span className="col-span-5 text-xs text-muted-foreground">Sans objet pour ce dossier</span>
              )}
            </Fragment>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Chaque scénario perturbe un axe (prix, travaux, durée…) à partir du bilan actuel — ce sont des indicateurs de sensibilité, pas des prévisions certaines.
        </p>
      </CardContent>
    </Card>
  );
}
