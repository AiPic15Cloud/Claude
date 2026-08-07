import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
  /** Renders as the larger, gradient-filled bento tile — reserve for the most important metrics in the row. The
   * accent is spent in one place only: every hero tile shares the same primary→chart-3 diagonal gradient rather
   * than a different hue each. chart-3 (blue) was picked over success/warning specifically because
   * primary-foreground text stays comfortably AA-legible against it in both themes — checked against the real
   * contrast formula, not eyeballed (worst case is dark mode's near-black text on chart-3, ~5:1). */
  hero?: boolean;
}

export function KpiCard({ label, value, icon: Icon, hint, trend, hero }: KpiCardProps) {
  return (
    <Card className={cn(hero && 'border-transparent bg-gradient-to-br from-primary to-chart-3 text-primary-foreground lg:col-span-2')}>
      <CardContent className={cn('flex items-start justify-between gap-3 p-4', hero && 'p-5')}>
        <div className="flex flex-col gap-1.5">
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', hero ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {label}
          </span>
          <span className={cn('font-display font-semibold tracking-tight tabular-nums', hero ? 'text-4xl' : 'text-2xl')}>{value}</span>
          {hint && (
            <span
              className={cn(
                'text-xs font-medium',
                hero
                  ? 'text-primary-foreground/80'
                  : cn(
                      trend === 'up' && 'text-success',
                      trend === 'down' && 'text-destructive',
                      (!trend || trend === 'neutral') && 'text-muted-foreground',
                    ),
              )}
            >
              {hint}
            </span>
          )}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md text-muted-foreground',
            hero ? 'h-9 w-9 bg-primary-foreground/15 text-primary-foreground' : 'h-7 w-7 border border-border',
          )}
        >
          <Icon className={hero ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        </div>
      </CardContent>
    </Card>
  );
}
