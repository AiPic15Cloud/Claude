import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRateHistory } from '../hooks/use-rate-history';

function monthLabel(period: string): string {
  const date = new Date(`${period}-01`);
  return Number.isNaN(date.getTime()) ? period : format(date, 'MMM yy', { locale: fr });
}

export function RateHistoryChart() {
  const { data, isLoading } = useRateHistory();

  if (isLoading || !data) {
    return <Skeleton className="h-72 w-full" />;
  }

  // Merge the two series (Eurostat monthly / ECB daily-collapsed-to-monthly)
  // on their shared "YYYY-MM" period key so a month missing on one side
  // still renders — recharts simply leaves a gap in that line.
  const periods = Array.from(new Set([...data.oat10y.map((p) => p.period), ...data.ecbPolicyRate.map((p) => p.period)])).sort();
  const oat10yByPeriod = new Map(data.oat10y.map((p) => [p.period, p.value]));
  const ecbByPeriod = new Map(data.ecbPolicyRate.map((p) => [p.period, p.value]));
  const chartData = periods.map((period) => ({
    period,
    label: monthLabel(period),
    oat10y: oat10yByPeriod.get(period) ?? null,
    ecbPolicyRate: ecbByPeriod.get(period) ?? null,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Taux directeur BCE & OAT 10Y — 24 mois</CardTitle>
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
        <CardTitle>Taux directeur BCE & OAT 10Y — 24 mois</CardTitle>
      </CardHeader>
      <CardContent className="h-72 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              tickFormatter={(v: number) => `${v}%`}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [`${value?.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}%`, name]}
            />
            <Line
              type="monotone"
              dataKey="oat10y"
              name="OAT 10Y (France)"
              stroke="hsl(var(--chart-accent))"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ecbPolicyRate"
              name="Taux directeur BCE"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] text-muted-foreground">Sources : Eurostat (OAT 10Y, France) · ECB Data Portal (taux de refinancement principal).</p>
      </CardContent>
    </Card>
  );
}
