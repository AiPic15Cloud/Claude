import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useDealRisk, useRecomputeRisk } from '../hooks/use-risk';
import { RiskMethodologySheet } from './risk-methodology-sheet';

// Sémantique inversée de scoreColor (Score ATLAS) : ici, haut = mauvais.
function riskColor(value: number): string {
  if (value >= 70) return 'bg-destructive';
  if (value >= 40) return 'bg-warning';
  return 'bg-success';
}

export function RiskBreakdownCard({ dealId }: { dealId: string }) {
  const { data, isLoading } = useDealRisk(dealId);
  const recompute = useRecomputeRisk(dealId);

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.suppressed || data.score === null) {
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Risque ATLAS</CardTitle>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.score}/100</p>
        </div>
        <div className="flex items-center gap-1">
          <RiskMethodologySheet />
          <Button variant="outline" size="sm" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
            {recompute.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Recalculer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.factors.map((factor) => (
          <div key={factor.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{factor.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {factor.value}/100 · poids {Math.round(factor.weight * 100)}%
              </span>
            </div>
            <Progress value={factor.value} className="h-1.5" indicatorClassName={riskColor(factor.value)} />
            <p className="text-xs text-muted-foreground">{factor.explanation}</p>
          </div>
        ))}
        <p className="mt-2 border-t border-border pt-3 text-xs text-muted-foreground">{data.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
