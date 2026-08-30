import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AumHistoryPoint } from '@/types';
import { formatCurrency } from '@/lib/format';

interface AumHistoryChartProps {
  history: AumHistoryPoint[];
}

export function AumHistoryChart({ history }: AumHistoryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution de l'encours</CardTitle>
      </CardHeader>
      <CardContent className="h-64 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-accent))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--chart-accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              tickFormatter={(v: number) => formatCurrency(v)}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [formatCurrency(value), 'Encours']}
            />
            <Area
              type="monotone"
              dataKey="crd"
              stroke="hsl(var(--chart-accent))"
              strokeWidth={2}
              fill="url(#aumGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
