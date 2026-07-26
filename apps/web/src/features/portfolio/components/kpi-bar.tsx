import { useDealKpis } from '../hooks/use-deals';
import { formatCurrency } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

export function KpiBar() {
  const { data, isLoading } = useDealKpis();

  if (isLoading || !data) {
    return (
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-40" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'Opérations actives', value: String(data.activeDeals) },
    { label: 'Encours', value: formatCurrency(data.totalAum) },
    { label: 'Collecté', value: formatCurrency(data.totalRaised) },
    { label: 'Avancement', value: `${data.fundingProgress}%` },
    { label: 'Taux moyen', value: `${data.averageInterestRate}%` },
    { label: 'En retard', value: String(data.lateDeals), destructive: data.lateDeals > 0 },
  ];

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-border bg-card px-5 py-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</span>
          <span className={`text-base font-semibold tabular-nums ${stat.destructive ? 'text-destructive' : ''}`}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
