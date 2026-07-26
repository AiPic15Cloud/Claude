import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExtendDeadlineDialog } from '@/features/dossiers/components/extend-deadline-dialog';
import type { DealDeadlineAlert } from '@/types';
import { cn } from '@/lib/utils';

const LEVEL_DOT: Record<DealDeadlineAlert['level'], string> = {
  RAS: 'bg-success',
  ATTENTION: 'bg-warning',
  URGENT: 'bg-destructive',
};

interface DeadlineAlertsCardProps {
  alerts: DealDeadlineAlert[];
}

export function DeadlineAlertsCard({ alerts }: DeadlineAlertsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Échéances de vote</CardTitle>
        <span className="text-xs text-muted-foreground">{alerts.length}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {alerts.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Aucune échéance à surveiller. RAS.</p>}
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-accent">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', LEVEL_DOT[alert.level])} />
            <Link to={`/deals/${alert.id}`} className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{alert.name}</p>
              <p className="truncate text-xs text-muted-foreground">{alert.actionLabel}</p>
            </Link>
            {alert.daysToMax <= 0 ? (
              <ExtendDeadlineDialog dealId={alert.id} dealName={alert.name} currentDateMax={alert.dateMax} />
            ) : (
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">J-{alert.daysToMax}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
