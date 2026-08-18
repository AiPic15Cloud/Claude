import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodStepper } from '@/components/ui/period-stepper';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useFeesSummary, useFeesProjection } from '@/features/cockpit/hooks/use-fees';
import { EditFeesTargetDialog } from '@/features/cockpit/components/edit-fees-target-dialog';
import { HeroMetric } from '@/features/cockpit/components/hero-metric';
import { formatCurrency } from '@/lib/format';
import { exportToExcel } from '@/lib/export-xlsx';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

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

  const handleExport = () => {
    const rows = monthly.map((m, i) => {
      const isFuture = year === currentYear && i > new Date().getMonth();
      const pct = m.Objectif > 0 ? Math.round((m.Réalisé / m.Objectif) * 100) : 0;
      return {
        Mois: m.month,
        Objectif: Math.round(m.Objectif),
        Réalisé: isFuture ? null : m.Réalisé,
        'Cumul objectif': m.cumObjectif,
        'Cumul réalisé': isFuture ? null : m.cumRéalisé,
        '% atteinte': isFuture ? null : pct,
      };
    });
    exportToExcel(`atlas-objectifs-${year}.xlsx`, `Objectifs ${year}`, rows);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Performance"
        title={`Objectifs fees ${year}`}
        description="Fees facturés vs objectif annuel, avec projection basée sur le pipeline en cours."
        actions={
          <>
            <PeriodStepper
              label={year}
              onPrev={() => setYear((y) => y - 1)}
              onNext={() => setYear((y) => y + 1)}
              nextDisabled={year >= currentYear}
            />
            <Button variant="outline" size="sm" onClick={handleExport} disabled={monthly.length === 0}>
              <Download className="h-3.5 w-3.5" /> Exporter
            </Button>
            <EditFeesTargetDialog year={year} currentTarget={data?.annualTarget ?? null} />
          </>
        }
      />

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Skeleton className="h-28 w-64" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        </div>
      ) : (
        <HeroMetric
          label="Réalisé YTD"
          value={formatCurrency(data.annualActual)}
          context={data.progressPct !== null ? `${data.progressPct}% de l'objectif annuel` : undefined}
          stats={[
            { label: 'Objectif annuel', value: data.annualTarget !== null ? formatCurrency(data.annualTarget) : '—' },
            { label: 'Écart (au prorata)', value: formatCurrency(Math.abs(ecart)), tone: ecart >= 0 ? 'default' : 'down' },
            { label: 'Meilleur mois', value: bestMonth?.Réalisé ? bestMonth.month : '—' },
            {
              label: 'Projection pipeline',
              value: projectionLoading || !projection ? '…' : formatCurrency(projection.projectedFees),
            },
          ]}
        />
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
                <AreaChart data={monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="objectifMensuelGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="realiseMensuelGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-accent))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--chart-accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => formatCurrency(v)} width={70} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="Objectif"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    fill="url(#objectifMensuelGradient)"
                  />
                  <Area type="monotone" dataKey="Réalisé" stroke="hsl(var(--chart-accent))" strokeWidth={2} fill="url(#realiseMensuelGradient)" />
                </AreaChart>
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
                <ComposedChart data={monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumRealiseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-accent))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--chart-accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => formatCurrency(v)} width={70} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="cumObjectif" name="Cumul objectif" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} />
                  <Area
                    type="monotone"
                    dataKey="cumRéalisé"
                    name="Cumul réalisé"
                    stroke="hsl(var(--chart-accent))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    fill="url(#cumRealiseGradient)"
                  />
                </ComposedChart>
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mois</TableHead>
                <TableHead className="text-right">Objectif</TableHead>
                <TableHead className="text-right">Réalisé</TableHead>
                <TableHead className="text-right">Cumul obj.</TableHead>
                <TableHead className="text-right">Cumul réal.</TableHead>
                <TableHead className="text-right">% atteinte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthly.map((m, i) => {
                const isFuture = year === currentYear && i > new Date().getMonth();
                const pct = m.Objectif > 0 ? Math.round((m.Réalisé / m.Objectif) * 100) : 0;
                return (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(m.Objectif)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{isFuture ? '—' : formatCurrency(m.Réalisé)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(m.cumObjectif)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{isFuture ? '—' : formatCurrency(m.cumRéalisé)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono tabular-nums font-medium',
                        !isFuture && (pct >= 100 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-destructive'),
                      )}
                    >
                      {isFuture ? '—' : `${pct}%`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
