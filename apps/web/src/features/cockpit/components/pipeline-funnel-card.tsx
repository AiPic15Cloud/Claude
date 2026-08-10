import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineSummary } from '@/features/pipeline/hooks/use-pipeline';
import { cn } from '@/lib/utils';

// Real sequential conversion — each stage is a strict subset of the previous one
// (received ⊇ validated ⊇ converted), unlike the Cockpit's other "Pipeline" card
// which is a snapshot of where active deals currently sit, not a funnel.
const STAGE_FILL = [
  'bg-chart-accent dark:bg-gradient-to-r dark:from-chart-accent dark:to-chart-2',
  'bg-chart-2 dark:bg-gradient-to-r dark:from-chart-2 dark:to-chart-3',
  'bg-chart-3 dark:bg-gradient-to-r dark:from-chart-3 dark:to-chart-4',
];

export function PipelineFunnelCard() {
  const { data, isLoading } = usePipelineSummary();

  const stages = data
    ? [
        { label: 'Reçus', count: data.received },
        { label: 'Validés', count: data.validatedCount },
        { label: 'Convertis', count: data.convertedCount },
      ]
    : [];
  const max = stages[0]?.count || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Entonnoir de conversion</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : stages[0].count === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Aucun dossier reçu pour le moment.</p>
        ) : (
          stages.map((s, i) => {
            const pct = Math.round((s.count / max) * 100);
            return (
              <div key={s.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{s.count}</span>
                </div>
                <div className="h-8 w-full overflow-hidden rounded-md bg-muted">
                  <div
                    className={cn('h-full rounded-md transition-all', STAGE_FILL[i])}
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
