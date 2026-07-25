import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDealScore, useRecomputeScore } from '../hooks/use-score';
import { cn } from '@/lib/utils';

function scoreColor(value: number): string {
  if (value >= 70) return 'bg-success';
  if (value >= 40) return 'bg-warning';
  return 'bg-destructive';
}

export function ScoreBreakdownCard({ dealId }: { dealId: string }) {
  const { data, isLoading } = useDealScore(dealId);
  const recompute = useRecomputeScore(dealId);

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Score ATLAS</CardTitle>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.score}/100</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          {recompute.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Recalculer
        </Button>
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
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', scoreColor(factor.value))} style={{ width: `${factor.value}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{factor.explanation}</p>
          </div>
        ))}
        <p className="mt-2 border-t border-border pt-3 text-xs text-muted-foreground">{data.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
