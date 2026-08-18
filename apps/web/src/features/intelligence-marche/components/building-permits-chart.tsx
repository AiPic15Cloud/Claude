import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBuildingPermitsHistory } from '../hooks/use-building-permits-history';

function monthLabel(period: string): string {
  const date = new Date(`${period}-01`);
  return Number.isNaN(date.getTime()) ? period : format(date, 'MMM yy', { locale: fr });
}

export function BuildingPermitsChart() {
  const { data, isLoading } = useBuildingPermitsHistory();

  if (isLoading || !data) {
    return <Skeleton className="h-72 w-full" />;
  }

  const chartData = data.map((p) => ({ period: p.period, label: monthLabel(p.period), value: p.value }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permis de construire — France, 5 ans</CardTitle>
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
        <CardTitle>Permis de construire — France, 5 ans</CardTitle>
      </CardHeader>
      <CardContent className="h-72 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="buildingPermitsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
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
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" width={40} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [value.toLocaleString('fr-FR', { maximumFractionDigits: 1 }), 'Indice']}
            />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#buildingPermitsGradient)" />
          </AreaChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Source : Eurostat (sts_cobp_m) — indice mensuel des permis de bâtir, France, base 2021 = 100.
        </p>
      </CardContent>
    </Card>
  );
}
