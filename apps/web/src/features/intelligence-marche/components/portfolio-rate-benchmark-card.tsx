import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDealKpis } from '@/features/portfolio/hooks/use-deals';
import { useMarketIndicators } from '../hooks/use-market-indicators';

/**
 * Le seul indicateur de cette page qui n'est pas une simple reprise de
 * données publiques : confronte le taux moyen réellement pratiqué sur le
 * portefeuille ATLAS à la moyenne marché des prêts immobiliers (ECB). Les
 * deux ne sont pas la même catégorie de crédit (financement court terme
 * d'opérations vs prêt immobilier bancaire) — l'écart n'est donc pas un
 * signal "bon/mauvais", juste un repère macro, d'où l'absence volontaire de
 * code couleur succès/alerte sur le delta.
 */
export function PortfolioRateBenchmarkCard() {
  const { data: kpis, isLoading: kpisLoading } = useDealKpis();
  const { data: indicators, isLoading: indicatorsLoading } = useMarketIndicators();

  if (kpisLoading || indicatorsLoading || !kpis || !indicators) {
    return <Skeleton className="h-40 w-full" />;
  }

  const marketRate = indicators.mortgageRate.value;
  const portfolioRate = kpis.averageInterestRate;
  const delta = marketRate !== null && portfolioRate ? portfolioRate - marketRate : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Votre taux vs le marché</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Taux moyen ATLAS</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {portfolioRate ? portfolioRate.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—'}%
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Opérations actives</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Marché — prêts immobiliers</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {marketRate !== null ? marketRate.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—'}%
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{indicators.mortgageRate.period ?? '—'}</p>
          </div>
        </div>
        {delta !== null && (
          <p className="text-xs text-muted-foreground">
            Écart de <span className="font-medium text-foreground">{delta >= 0 ? '+' : ''}{delta.toFixed(2)} pt</span> par rapport
            au marché — le financement court terme d'opérations (ATLAS) et le crédit immobilier bancaire ne sont pas la même catégorie
            de risque, cet écart est un repère macro, pas un signal de sur/sous-tarification.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
