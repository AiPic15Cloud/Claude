import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { DYNAMISM_LABELS } from '../platform-metadata';
import type { MarketBenchmark } from '../market-benchmark.util';

const DYNAMISM_ORDER: (keyof MarketBenchmark['dynamismCounts'])[] = ['CROISSANCE', 'STABLE', 'RALENTISSEMENT', 'nonRenseigne'];

/**
 * Bloc de repère marché global (spec baromètre-crowdfunding.com, priorisation
 * NEXT) — vue d'ensemble du marché du crowdfunding immobilier suivi, en tête
 * de l'onglet Intelligence Concurrentielle. Chaque chiffre indique
 * explicitement sur combien de plateformes il porte (principe 0.3).
 */
export function MarketBenchmarkCard({ benchmark }: { benchmark: MarketBenchmark }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Repère marché global — {benchmark.withDataCount} plateforme{benchmark.withDataCount > 1 ? 's' : ''} avec données baromètre sur{' '}
          {benchmark.platformCount} suivie{benchmark.platformCount > 1 ? 's' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Capital financé cumulé</p>
            <p className="text-xl font-semibold tabular-nums">
              {benchmark.totalFundedSum !== null ? formatCurrency(benchmark.totalFundedSum) : 'Non calculable'}
            </p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Taux de risque moyen pondéré</p>
            <p className="text-xl font-semibold tabular-nums">
              {benchmark.weightedRiskRatePct !== null ? `${benchmark.weightedRiskRatePct}%` : 'Non calculable'}
            </p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Score externe moyen pondéré</p>
            <p className="text-xl font-semibold tabular-nums" title="Moyenne pondérée par capital financé des scores baromètre-crowdfunding.com — jamais un score Atlas natif">
              {benchmark.weightedExternalScore !== null ? benchmark.weightedExternalScore : 'Non calculable'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DYNAMISM_ORDER.map((key) => (
            <div key={key} className="flex flex-col rounded-md border border-border p-2">
              <span className="text-[11px] text-muted-foreground">{key === 'nonRenseigne' ? 'Non renseigné' : DYNAMISM_LABELS[key]}</span>
              <span className="font-medium tabular-nums">{benchmark.dynamismCounts[key]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
