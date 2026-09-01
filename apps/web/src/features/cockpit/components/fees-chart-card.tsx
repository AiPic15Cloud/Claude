import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PeriodStepper } from '@/components/ui/period-stepper';
import { useFeesSummary } from '../hooks/use-fees';
import { EditFeesTargetDialog } from './edit-fees-target-dialog';
import { formatCurrency } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export function FeesChartCard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useFeesSummary(year);

  const chartData = (data?.monthly ?? []).map((m) => ({ month: MONTH_LABELS[m.month - 1], amount: m.amount }));
  const monthlyTarget = data?.annualTarget ? data.annualTarget / 12 : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Fees générés</CardTitle>
          <div className="mt-1">
            <PeriodStepper
              size="sm"
              label={year}
              onPrev={() => setYear((y) => y - 1)}
              onNext={() => setYear((y) => y + 1)}
              nextDisabled={year >= currentYear}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/objectifs">Voir en détail →</Link>
          </Button>
          <EditFeesTargetDialog year={year} currentTarget={data?.annualTarget ?? null} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Réalisé {year}</span>
                <span className="font-mono text-lg font-semibold tabular-nums">{formatCurrency(data.annualActual)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Objectif annuel</span>
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {data.annualTarget !== null ? formatCurrency(data.annualTarget) : '—'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">% atteint</span>
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {data.progressPct !== null ? `${data.progressPct}%` : '—'}
                </span>
              </div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="feesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-accent))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--chart-accent))" stopOpacity={0} />
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
                    formatter={(value: number) => [formatCurrency(value), 'Fees']}
                  />
                  {monthlyTarget !== null && (
                    <ReferenceLine
                      y={monthlyTarget}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      label={{ value: 'Objectif / mois', fontSize: 10, fill: 'hsl(var(--muted-foreground))', position: 'insideTopRight' }}
                    />
                  )}
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--chart-accent))" strokeWidth={2} fill="url(#feesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
