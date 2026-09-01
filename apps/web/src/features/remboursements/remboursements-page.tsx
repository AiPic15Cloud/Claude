import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PeriodStepper } from '@/components/ui/period-stepper';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useRepaymentsSummary } from '@/features/cockpit/hooks/use-repayments-summary';
import { useRepaymentsList } from './hooks/use-repayments-list';
import { HeroMetric } from '@/features/cockpit/components/hero-metric';
import { formatCurrency, formatDate } from '@/lib/format';
import type { RepaymentWithDeal } from '@/types';

const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const MONTH_LABELS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export function RemboursementsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: summary, isLoading: isLoadingSummary } = useRepaymentsSummary(year);
  const { data: repayments, isLoading: isLoadingList } = useRepaymentsList(year);

  const chartData = (summary?.monthly ?? []).map((m) => ({
    month: MONTH_LABELS_SHORT[m.month - 1],
    Réalisé: m.actual,
    Projeté: m.projected,
  }));

  const monthlyGroups = useMemo(() => {
    const buckets = new Map<number, RepaymentWithDeal[]>();
    for (const r of repayments ?? []) {
      const month = new Date(r.date).getMonth();
      if (!buckets.has(month)) buckets.set(month, []);
      buckets.get(month)!.push(r);
    }
    // Most recent month first, matching the list's own desc order.
    return Array.from(buckets.entries()).sort((a, b) => b[0] - a[0]);
  }, [repayments]);

  const dealsConcerned = new Set((repayments ?? []).map((r) => r.deal.id)).size;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Portefeuille"
        title={`Remboursements ${year}`}
        description="Détail mois par mois des remboursements réalisés et projetés, avec les projets concernés."
        actions={
          <PeriodStepper
            label={year}
            onPrev={() => setYear((y) => y - 1)}
            onNext={() => setYear((y) => y + 1)}
            nextDisabled={year >= currentYear}
          />
        }
      />

      {isLoadingSummary || !summary ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Skeleton className="h-28 w-64" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        </div>
      ) : (
        <HeroMetric
          label={`Réalisé ${year}`}
          value={formatCurrency(summary.totalActual)}
          context={`${formatCurrency(summary.totalProjected)} projetés sur l'année`}
          stats={[
            { label: 'Remboursements', value: String(repayments?.length ?? 0) },
            { label: 'Dossiers concernés', value: String(dealsConcerned) },
          ]}
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Mensuel · Réalisé vs Projeté</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isLoadingSummary ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="remboursementsRealiseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-accent))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--chart-accent))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="remboursementsProjeteGradient" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="Réalisé" stackId="a" stroke="hsl(var(--chart-accent))" strokeWidth={2} fill="url(#remboursementsRealiseGradient)" />
                <Area type="monotone" dataKey="Projeté" stackId="a" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#remboursementsProjeteGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {isLoadingList ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : monthlyGroups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Aucun remboursement enregistré en {year}.</CardContent>
        </Card>
      ) : (
        monthlyGroups.map(([month, items]) => {
          const totalActual = items.filter((r) => !r.projected).reduce((sum, r) => sum + Number(r.amount), 0);
          const totalProjected = items.filter((r) => r.projected).reduce((sum, r) => sum + Number(r.amount), 0);
          return (
            <Card key={month}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{MONTH_LABELS[month]}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalActual)} réalisés
                  {totalProjected > 0 && ` · ${formatCurrency(totalProjected)} projetés`}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Dossier</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(r.date)}</TableCell>
                        <TableCell>
                          <Link to={`/deals/${r.deal.id}`} className="text-sm font-medium text-primary hover:underline">
                            {r.deal.name}
                          </Link>
                          <span className="ml-1.5 text-xs text-muted-foreground">{r.deal.reference}</span>
                        </TableCell>
                        <TableCell>
                          {r.projected ? <Badge variant="warning">Projeté</Badge> : <Badge variant="success">Réalisé</Badge>}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.note ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">{formatCurrency(r.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
