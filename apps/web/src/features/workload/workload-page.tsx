import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkload } from './use-workload';
import { PRIORITY_LABELS, type Priority } from '@/types';

const PRIORITY_VARIANT: Record<Priority, 'default' | 'warning' | 'destructive' | 'secondary'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
};

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatHours(hours: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(hours)}h`;
}

/**
 * Vue transversale de la charge de travail par analyste (spec gestion de
 * projet — workload.service.ts). L'API ne renvoie que les analystes ayant
 * au moins une tâche ouverte, déjà triés par openCount décroissant — pas de
 * tri côté client.
 */
export function WorkloadPage() {
  const { data: entries = [], isLoading } = useWorkload();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Charge de travail</h1>
        <p className="text-sm text-muted-foreground">Tâches ouvertes par analyste, toutes équipes confondues.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Aucune tâche ouverte assignée pour le moment</CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <Card key={entry.assigneeId}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{entry.assigneeName}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{entry.openCount} tâche{entry.openCount > 1 ? 's' : ''} ouverte{entry.openCount > 1 ? 's' : ''}</Badge>
                    {entry.overdueCount > 0 && (
                      <Badge variant="destructive">{entry.overdueCount} en retard</Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium tabular-nums">
                    {entry.estimatedHoursTotal > 0 ? `${formatHours(entry.estimatedHoursTotal)} estimées` : 'Aucune heure estimée'}
                  </span>
                  {entry.unestimatedCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      (+ {entry.unestimatedCount} tâche{entry.unestimatedCount > 1 ? 's' : ''} non chiffrée{entry.unestimatedCount > 1 ? 's' : ''})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {PRIORITIES.filter((p) => entry.byPriority[p] > 0).map((p) => (
                    <Badge key={p} variant={PRIORITY_VARIANT[p]} className="text-[11px]">
                      {PRIORITY_LABELS[p]} · {entry.byPriority[p]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
