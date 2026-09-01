import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ExtendDeadlineDialog } from '@/features/dossiers/components/extend-deadline-dialog';
import { ExpandCardButton } from './expand-card-button';
import type { DealDeadlineAlert } from '@/types';
import { cn } from '@/lib/utils';

const LEVEL_INDICATOR: Record<DealDeadlineAlert['level'], string> = {
  RAS: 'bg-success',
  ATTENTION: 'bg-warning',
  URGENT: 'bg-destructive',
};

const LEVEL_BADGE: Record<DealDeadlineAlert['level'], string> = {
  RAS: 'bg-success/10 text-success',
  ATTENTION: 'bg-warning/10 text-warning',
  URGENT: 'bg-destructive/10 text-destructive',
};

// How close to the deadline the gauge reads as — not a linear day count, the
// stage a deal is already sorted into, so the fill matches the same J-90/
// J-60/J-30/J-15/contentieux thresholds driving the alert itself.
const STAGE_PCT: Record<NonNullable<DealDeadlineAlert['stage']> | 'RAS', number> = {
  RAS: 12,
  J90: 25,
  J60: 45,
  J30: 65,
  J15: 85,
  CONTENTIEUX: 100,
};

const STAGE_LABEL: Record<NonNullable<DealDeadlineAlert['stage']> | 'RAS', string> = {
  RAS: 'Sain',
  J90: 'J-90',
  J60: 'J-60',
  J30: 'J-30',
  J15: 'J-15',
  CONTENTIEUX: 'Contentieux',
};

interface DeadlineAlertsCardProps {
  alerts: DealDeadlineAlert[];
}

function renderAlertItem(alert: DealDeadlineAlert, expanded: boolean) {
  const stageKey = alert.stage ?? 'RAS';
  return (
    <div key={alert.id} className="flex flex-col gap-1.5 rounded-md px-1.5 py-2 hover:bg-accent">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/deals/${alert.id}`}
          className={cn('min-w-0 flex-1 text-sm font-medium hover:text-primary', expanded ? 'whitespace-normal break-words' : 'truncate')}
        >
          {alert.name}
        </Link>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            LEVEL_BADGE[alert.level],
          )}
        >
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', LEVEL_INDICATOR[alert.level])} />
          {STAGE_LABEL[stageKey]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={STAGE_PCT[stageKey]} className="h-1 flex-1" indicatorClassName={LEVEL_INDICATOR[alert.level]} />
        {alert.daysToMax <= 0 && (
          <ExtendDeadlineDialog dealId={alert.id} dealName={alert.name} currentDateMax={alert.dateMax} />
        )}
      </div>
    </div>
  );
}

export function DeadlineAlertsCard({ alerts }: DeadlineAlertsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Échéances de vote</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{alerts.length}</span>
          {alerts.length > 0 && (
            <ExpandCardButton title="Échéances de vote">{alerts.map((alert) => renderAlertItem(alert, true))}</ExpandCardButton>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {alerts.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Aucune échéance à surveiller. RAS.</p>}
        {alerts.map((alert) => renderAlertItem(alert, false))}
      </CardContent>
    </Card>
  );
}
