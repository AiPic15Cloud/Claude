import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeesSummary, useFeesProjection } from '@/features/cockpit/hooks/use-fees';
import { EditFeesTargetDialog } from '@/features/cockpit/components/edit-fees-target-dialog';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function KpiTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'success' | 'destructive' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', tone === 'success' && 'text-success', tone === 'destructive' && 'text-destructive')}>
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function ObjectifsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useFeesSummary(year);
  const { data: projection, isLoading: projectionLoading } = useFeesProjection();

  const monthlyTarget = data?.annualTarget ? data.annualTarget / 12 : 0;
  let cumObjectif = 0;
  let cumReal = 0;
  const monthly = (data?.monthly ?? []).map((m) => {
    cumObjectif += monthlyTarget;
    cumReal += m.amount;
    return {
      month: MONTH_LABELS[m.month - 1],
      Objectif: monthlyTarget,
      Réalisé: m.amount,
      cumObjectif: Math.round(cumObjectif),
      cumRéalisé: Math.round(cumReal),
    };
  });
  const bestMonth = monthly.reduce((best, m) => (m.Réalisé > (best?.Réalisé ?? -1) ? m : best), monthly[0]);
  const ecart = data ? data.annualActual - (data.annualTarget ?? 0) * (new Date().getMonth() + 1) / 12 : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Performance</p>
          <h1 className="text-xl font-semibold tracking-tight">Objectifs fees {year}</h1>
          <p className="text-sm text-muted-foreground">
            Fees facturés vs objectif annuel, avec projection basée sur le pipeline en cours.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setYear((y) => y - 1)}>
            ← {year - 1}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setYear((y) => y + 1)} disabled={year >= currentYear}>
            {year + 1} →
          </Button>
          <EditFeesTargetDialog year={year} currentTarget={data?.annualTarget ?? null} />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiTile label="Objectif annuel" value={data.annualTarget !== null ? formatCurrency(data.annualTarget) : '—'} />
          <KpiTile label="Réalisé YTD" value={formatCurrency(data.annualActual)} hint={data.progressPct !== null ? `${data.progressPct}%` : undefined} />
          <KpiTile
            label="Écart (au prorata)"
            value={formatCurrency(Math.abs(ecart))}
            hint={ecart >= 0 ? 'vs objectif' : 'vs objectif'}
            tone={ecart >= 0 ? 'success' : 'destructive'}
          />
          <KpiTile label="Meilleur mois" value={bestMonth?.Réalisé ? bestMonth.month : '—'} />
          <KpiTile
            label="Projection pipeline"
            value={projectionLoading || !projection ? '…' : formatCurrency(projection.projectedFees)}
            hint={
              projection
                ? `taux moyen ${projection.avgFeesRate}% · conversion ${projection.conversionRate}%${projection.conversionRateIsDefault ? ' (estimation, pas encore d\'historique comité)' : ''}`
                : undefined
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Mensuel · Objectif vs Réalisé</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => formatCurrency(v)} width={70} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="Objectif" fill="hsl(var(--muted-foreground))" fillOpacity={0.35} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Réalisé" fill="hsl(var(--chart-accent))" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Cumul · Objectif vs Réalisé</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => formatCurrency(v)} width={70} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="cumObjectif" name="Cumul objectif" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="cumRéalisé" name="Cumul réalisé" stroke="hsl(var(--chart-accent))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Détail mensuel</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Mois</th>
                  <th className="px-4 py-2 text-right">Objectif</th>
                  <th className="px-4 py-2 text-right">Réalisé</th>
                  <th className="px-4 py-2 text-right">Cumul obj.</th>
                  <th className="px-4 py-2 text-right">Cumul réal.</th>
                  <th className="px-4 py-2 text-right">% atteinte</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => {
                  const isFuture = year === currentYear && i > new Date().getMonth();
                  const pct = m.Objectif > 0 ? Math.round((m.Réalisé / m.Objectif) * 100) : 0;
                  return (
                    <tr key={m.month} className="border-b border-border/60">
                      <td className="px-4 py-2 font-medium">{m.month}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(m.Objectif)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{isFuture ? '—' : formatCurrency(m.Réalisé)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(m.cumObjectif)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{isFuture ? '—' : formatCurrency(m.cumRéalisé)}</td>
                      <td
                        className={cn(
                          'px-4 py-2 text-right tabular-nums font-medium',
                          !isFuture && (pct >= 100 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-destructive'),
                        )}
                      >
                        {isFuture ? '—' : `${pct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
