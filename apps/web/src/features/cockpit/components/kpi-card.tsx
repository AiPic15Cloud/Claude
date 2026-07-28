import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
  /** Renders as the larger, accented bento tile — reserve for the single most important metric in the row. */
  hero?: boolean;
}

export function KpiCard({ label, value, icon: Icon, hint, trend, hero }: KpiCardProps) {
  return (
    <Card className={cn(hero && 'border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card lg:col-span-2')}>
      <CardContent className={cn('flex items-start justify-between gap-3 p-4', hero && 'p-5')}>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className={cn('font-mono font-semibold tracking-tight tabular-nums', hero ? 'text-4xl' : 'text-2xl')}>{value}</span>
          {hint && (
            <span
              className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                (!trend || trend === 'neutral') && 'text-muted-foreground',
              )}
            >
              {hint}
            </span>
          )}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md border text-muted-foreground',
            hero ? 'h-9 w-9 border-primary/30 bg-primary/10 text-primary' : 'h-7 w-7 border-border',
          )}
        >
          <Icon className={hero ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        </div>
      </CardContent>
    </Card>
  );
}
