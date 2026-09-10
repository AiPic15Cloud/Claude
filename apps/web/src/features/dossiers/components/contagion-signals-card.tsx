import { Network, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useContagionSignals } from '../hooks/use-contagion-signals';
import { CONTAGION_PROXIMITY_LABELS, LEGAL_EVENT_TYPE_LABELS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';

/**
 * Signaux de contagion persistés (Market Relationship & Contagion
 * Intelligence V2, §10) — jamais recalculés côté client, toujours
 * l'explication exacte produite par ContagionService au moment du signal.
 */
export function ContagionSignalsCard({ dealId }: { dealId: string }) {
  const { data: signals, isLoading } = useContagionSignals(dealId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!signals || signals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="h-4 w-4" />
          Signaux de contagion ({signals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className={`flex flex-col gap-2 rounded-md border p-3 text-sm ${
              signal.contagionDemonstrated ? 'border-destructive/40 bg-destructive/5' : 'border-border'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {signal.contagionDemonstrated ? (
                  <TriangleAlert className="h-4 w-4 text-destructive" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{signal.sourceEntity.name}</span>
                {signal.legalEvent && <Badge variant="outline">{LEGAL_EVENT_TYPE_LABELS[signal.legalEvent.type]}</Badge>}
              </div>
              <Badge variant={signal.contagionDemonstrated ? 'destructive' : 'secondary'}>
                {CONTAGION_PROXIMITY_LABELS[signal.proximity]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{signal.explanation}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {signal.additionalExposure && Number(signal.additionalExposure) > 0 && (
                <span>Exposition additionnelle : {formatCurrency(Number(signal.additionalExposure))}</span>
              )}
              <span>Détecté le {formatDate(signal.createdAt)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
