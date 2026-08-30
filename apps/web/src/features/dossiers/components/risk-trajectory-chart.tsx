import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { RiskTrajectoryPoint } from '@/types';
import { formatDate } from '@/lib/format';

interface RiskTrajectoryChartProps {
  history: RiskTrajectoryPoint[];
  isLoading?: boolean;
}

export function RiskTrajectoryChart({ history, isLoading }: RiskTrajectoryChartProps) {
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (history.length < 2) {
    return <p className="text-xs text-muted-foreground">Pas encore assez d'historique pour tracer une trajectoire.</p>;
  }

  const data = history.map((point) => ({ ...point, label: formatDate(point.computedAt) }));

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="riskTrajectoryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" width={24} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(label: string) => label}
            formatter={(value: number) => [`${value}/100`, 'Risque composite']}
          />
          <Area
            type="monotone"
            dataKey="compositeScore"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            fill="url(#riskTrajectoryGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
