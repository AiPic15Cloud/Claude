import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodStepper } from '@/components/ui/period-stepper';
import { Skeleton } from '@/components/ui/skeleton';
import { useRepaymentsSummary } from '../hooks/use-repayments-summary';
import { formatCurrency } from '@/lib/format';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export function RepaymentsChartCard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useRepaymentsSummary(year);

  const chartData = (data?.monthly ?? []).map((m) => ({ month: MONTH_LABELS[m.month - 1], Réalisé: m.actual, Projeté: m.projected }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Remboursements</CardTitle>
          <div className="mt-1">
            <PeriodStepper
              size="sm"
              label={year}
              onPrev={() => setYear((y) => y - 1)}
              onNext={() => setYear((y) => y + 1)}
              nextDisabled={year > currentYear}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Réalisé {year}</span>
                <span className="font-mono text-lg font-semibold tabular-nums">{formatCurrency(data.totalActual)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projeté {year}</span>
                <span className="font-mono text-lg font-semibold tabular-nums text-chart-3">{formatCurrency(data.totalProjected)}</span>
              </div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repaymentsRealiseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-accent))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--chart-accent))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="repaymentsProjeteGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                    tickFormatter={(v) => formatCurrency(v)}
                    width={70}
                  />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--chart-accent))', strokeWidth: 1 }}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="Réalisé"
                    stackId="a"
                    stroke="hsl(var(--chart-accent))"
                    strokeWidth={2}
                    fill="url(#repaymentsRealiseGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Projeté"
                    stackId="a"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    fill="url(#repaymentsProjeteGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
