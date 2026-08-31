import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSourceCoverage } from '../hooks/use-market-intelligence';
import { SOURCE_HEALTH_LABELS, type SourceHealth } from '@/types';

const HEALTH_DOT: Record<SourceHealth, string> = {
  OPERATIONAL: 'bg-success',
  DEGRADED: 'bg-warning',
  BROKEN: 'bg-destructive',
  UNKNOWN: 'bg-muted-foreground/40',
};

/**
 * Couverture des sources externes (spec ATLAS v2, C.7) — "toujours exposer
 * ce qu'Atlas voit et ne voit pas". Une ligne par connecteur du Source
 * Registry (C.2), jamais un aggrégat qui masquerait une source en panne.
 */
export function SourceCoverageCard() {
  const { data, isLoading } = useSourceCoverage();
  if (isLoading || !data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Couverture des sources — {data.summary.operational}/{data.summary.total} opérationnelle(s)
          {data.summary.degraded > 0 && ` · ${data.summary.degraded} dégradée(s)`}
          {data.summary.broken > 0 && ` · ${data.summary.broken} en panne`}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-x-4 gap-y-1.5">
        {data.sources.map((source) => (
          <span key={source.key} title={SOURCE_HEALTH_LABELS[source.health]} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', HEALTH_DOT[source.health])} />
            {source.label}
            {source.lastCheckedAt && (
              <span className="text-muted-foreground/70">
                ({formatDistanceToNow(new Date(source.lastCheckedAt), { addSuffix: true, locale: fr })})
              </span>
            )}
          </span>
        ))}
      </CardContent>
    </Card>
  );
}
