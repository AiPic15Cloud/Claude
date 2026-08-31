import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DEAL_SURVEILLANCE_STATUS_LABELS, type DealSurveillanceStatus, type StressTest } from '@/types';

const TIER_ORDER: (DealSurveillanceStatus | 'NON_CALCULE')[] = ['FAIBLE', 'SOUS_SURVEILLANCE', 'ELEVE', 'CRITIQUE', 'NON_CALCULE'];

const TIER_LABEL: Record<string, string> = { ...DEAL_SURVEILLANCE_STATUS_LABELS, NON_CALCULE: 'Non calculé' };
const TIER_BAR: Record<string, string> = {
  FAIBLE: 'bg-success',
  SOUS_SURVEILLANCE: 'bg-warning',
  ELEVE: 'bg-warning',
  CRITIQUE: 'bg-destructive',
  NON_CALCULE: 'bg-muted-foreground/40',
};

/**
 * Exposition par palier de risque + stress test simple (spec ATLAS v2, A.8).
 * Le stress test est volontairement illustratif — un taux fixe sur
 * l'exposition ÉLEVÉ, pas un modèle de risque de crédit (même doctrine de
 * transparence que CRD_ASSUMPTION_DISCLAIMER ailleurs dans l'app).
 */
export function RiskExposureCard({ exposureByRiskTier, stressTest }: { exposureByRiskTier: Record<string, number>; stressTest: StressTest }) {
  const total = Object.values(exposureByRiskTier).reduce((sum, v) => sum + v, 0);
  const rows = TIER_ORDER.map((tier) => ({ tier, crd: exposureByRiskTier[tier] ?? 0 })).filter((r) => r.crd > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Exposition par risque</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {total === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Aucun dossier actif.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <div key={r.tier} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{TIER_LABEL[r.tier]}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(r.crd)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn('h-full rounded-full', TIER_BAR[r.tier])} style={{ width: `${(r.crd / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {stressTest.eleveExposure > 0 && (
          <div className="border-t border-border pt-2 text-xs text-muted-foreground">
            <p>
              Perte potentielle si {Math.round(stressTest.assumedDefaultRate * 100)} % des dossiers Élevé basculent en défaut :{' '}
              <span className="font-medium text-foreground">{formatCurrency(stressTest.potentialLoss)}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">Vue illustrative — pas un modèle de risque de crédit.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
