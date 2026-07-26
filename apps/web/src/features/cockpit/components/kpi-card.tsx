import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function KpiCard({ label, value, icon: Icon, hint, trend }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
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
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardContent>
    </Card>
  );
}
