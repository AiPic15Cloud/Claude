import { Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { marginTier, MARGIN_TIER_STYLES } from '@/lib/margin';
import { cn } from '@/lib/utils';
import type { FinancialScenario } from '@/types';

function formatEuro(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

/**
 * Sensibilité initiale vs actualisée — même principe que BP initial vs
 * actualisé : compare les 3 scénarios (Pessimiste/Base/Optimiste) tels
 * qu'ils étaient au moment du "Figer le BP initial" à leur recalcul
 * maintenant. N'apparaît qu'une fois le BP initial figé (avant, la carte
 * "Sensibilité" simple reste affichée, rien à comparer).
 */
export function SensitivityComparisonCard({ initial, current }: { initial: FinancialScenario[]; current: FinancialScenario[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sensibilité initiale vs actualisée</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scénario</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Marge initiale</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Marge actualisée</span>
          <span className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Écart</span>
          {current.map((scenario, i) => {
            const initialScenario = initial[i];
            if (!initialScenario) return null;
            const tierInitial = marginTier(initialScenario.marginPct);
            const tierCurrent = marginTier(scenario.marginPct);
            const styleInitial = MARGIN_TIER_STYLES[tierInitial];
            const styleCurrent = MARGIN_TIER_STYLES[tierCurrent];
            const deltaAbs = scenario.margin - initialScenario.margin;
            const isGood = deltaAbs > 0;
            return (
              <Fragment key={scenario.label}>
                <span className={scenario.label === 'Base' ? 'font-medium' : 'text-muted-foreground'}>{scenario.label}</span>
                <span className="tabular-nums">
                  {formatEuro(initialScenario.margin)} <span className={cn('text-xs', styleInitial.text)}>{styleInitial.dot} {initialScenario.marginPct}%</span>
                </span>
                <span className="tabular-nums">
                  {formatEuro(scenario.margin)} <span className={cn('text-xs', styleCurrent.text)}>{styleCurrent.dot} {scenario.marginPct}%</span>
                </span>
                <span className="text-right">
                  {deltaAbs === 0 ? (
                    <span className="text-xs text-muted-foreground">sans changement</span>
                  ) : (
                    <span className={cn('text-xs font-medium tabular-nums', isGood ? 'text-success' : 'text-destructive')}>
                      {deltaAbs > 0 ? '+' : ''}
                      {formatEuro(deltaAbs)}
                    </span>
                  )}
                </span>
              </Fragment>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          🟢 &gt; 30 % · 🟡 20–30 % · 🟠 10–20 % · 🔴 &lt; 10 % — mêmes seuils que la grille appliquée par les agents IA.
        </p>
      </CardContent>
    </Card>
  );
}
