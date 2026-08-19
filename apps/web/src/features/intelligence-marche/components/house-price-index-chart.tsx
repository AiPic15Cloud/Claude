import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useHousePriceIndexHistory } from '../hooks/use-house-price-index-history';

// Eurostat quarterly periods come as "YYYY-QN" — no Date parsing needed, just reformat for display.
function quarterLabel(period: string): string {
  const match = period.match(/^(\d{4})-Q(\d)$/);
  if (!match) return period;
  return `T${match[2]} ${match[1].slice(2)}`;
}

export function HousePriceIndexChart() {
  const { data, isLoading } = useHousePriceIndexHistory();

  if (isLoading || !data) {
    return <Skeleton className="h-72 w-full" />;
  }

  const chartData = data.map((p) => ({ period: p.period, label: quarterLabel(p.period), value: p.value }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prix immobilier — France, 8 ans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Historique indisponible pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prix immobilier — France, 8 ans</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="housePriceIndexGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              minTickGap={24}
            />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" width={40} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [value.toLocaleString('fr-FR', { maximumFractionDigits: 1 }), 'Indice']}
            />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-5))" strokeWidth={2} fill="url(#housePriceIndexGradient)" />
          </AreaChart>
        </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Source : Eurostat (prc_hpi_q) — indice trimestriel des prix des logements, France, base 2015 = 100.
        </p>
      </CardContent>
    </Card>
  );
}
