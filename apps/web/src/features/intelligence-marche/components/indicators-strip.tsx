import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketIndicators } from '../hooks/use-market-indicators';
import { cn } from '@/lib/utils';

function IndicatorTile({
  label,
  value,
  previousValue,
  period,
  suffix = '%',
}: {
  label: string;
  value: number | null;
  previousValue: number | null;
  period: string | null;
  suffix?: string;
}) {
  const delta = value !== null && previousValue !== null ? value - previousValue : null;

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {value === null ? (
          <p className="mt-1 text-sm text-muted-foreground">Indisponible</p>
        ) : (
          <>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
              {suffix}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {period}
              {delta !== null && (
                <span className={cn('ml-1.5 font-medium', delta >= 0 ? 'text-destructive' : 'text-success')}>
                  {delta >= 0 ? '+' : ''}
                  {delta.toFixed(2)}
                  {suffix}
                </span>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function IndicatorsStrip() {
  const { data, isLoading } = useMarketIndicators();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <IndicatorTile label="Taux long terme (OAT 10Y) — France" value={data.oat10y.value} previousValue={data.oat10y.previousValue} period={data.oat10y.period} />
      <IndicatorTile label="Taux court terme (zone euro)" value={data.euribor3m.value} previousValue={data.euribor3m.previousValue} period={data.euribor3m.period} />
      <IndicatorTile label="Inflation HICP — France (a/a)" value={data.inflationHicp.value} previousValue={data.inflationHicp.previousValue} period={data.inflationHicp.period} />
      <p className="col-span-full text-[11px] text-muted-foreground">Source : Eurostat (données officielles, mises à jour ~mensuellement).</p>
    </div>
  );
}
