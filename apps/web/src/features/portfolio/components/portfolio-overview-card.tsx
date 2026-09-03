import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolioOverview } from '../hooks/use-deals';
import { formatCurrency } from '@/lib/format';
import { DEAL_SURVEILLANCE_STATUS_LABELS, type DealSurveillanceStatus } from '@/types';

const PALIER_ORDER: (DealSurveillanceStatus | 'NON_CALCULE')[] = ['FAIBLE', 'SOUS_SURVEILLANCE', 'ELEVE', 'CRITIQUE', 'NON_CALCULE'];

/**
 * Dashboard portefeuille agrégé (spec ATLAS v2, module MARKO F.2) — combine
 * score de risque (A.2), CRD (A.3ter), statut de remboursement (A.3bis) et
 * TRI réalisé (D.4). Chaque métrique indique explicitement sur combien de
 * dossiers elle porte (principe 0.3 de la spec) — jamais un pourcentage nu
 * sans dénominateur visible.
 */
export function PortfolioOverviewCard() {
  const { data, isLoading } = usePortfolioOverview();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actif (suivi)</p>
            <p className="text-2xl font-semibold tabular-nums">{data.actif.count}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(data.actif.totalCrd)} de CRD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Perte définitive actée</p>
            <p className={`text-2xl font-semibold tabular-nums ${data.perte.count > 0 ? 'text-destructive' : ''}`}>{data.perte.count}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(data.perte.totalCrd)} de CRD au moment de la perte</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sorti / remboursé</p>
            <p className="text-2xl font-semibold tabular-nums">{data.sortiRembourse.count}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(data.sortiRembourse.totalAmount)} investis
              {data.sortiRembourse.triMoyenPct !== null && ` · TRI moyen ${data.sortiRembourse.triMoyenPct}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Score de risque moyen du portefeuille (pondéré par CRD, {data.actif.count} dossier{data.actif.count > 1 ? 's' : ''} actif
            {data.actif.count > 1 ? 's' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-2xl font-semibold tabular-nums">
            {data.scoreRisqueMoyenPondere !== null ? `${data.scoreRisqueMoyenPondere}/100` : 'Non calculable'}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PALIER_ORDER.map((tier) => {
              const entry = data.repartitionParPalier[tier] ?? { count: 0, crd: 0 };
              const label = tier === 'NON_CALCULE' ? 'Non calculé' : DEAL_SURVEILLANCE_STATUS_LABELS[tier];
              return (
                <div key={tier} className="flex flex-col rounded-md border border-border p-2">
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{entry.count}</span>
                  <span className="text-[11px] text-muted-foreground">{formatCurrency(entry.crd)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {data.esgCompletenessMoyenne.count > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Complétude ESG moyenne du portefeuille ({data.esgCompletenessMoyenne.count} dossier
              {data.esgCompletenessMoyenne.count > 1 ? 's' : ''} actif{data.esgCompletenessMoyenne.count > 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {data.esgCompletenessMoyenne.pct !== null ? `${data.esgCompletenessMoyenne.pct}%` : 'Non calculable'}
            </p>
            <p className="text-xs text-muted-foreground">
              Suivi personnel de la documentation ESG (D.3) — jamais un indicateur de qualité d'actif.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
