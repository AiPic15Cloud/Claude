import { useMarketTicker } from './use-market-ticker';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

function TickerItem({ label, value, changePct }: { label: string; value: string; changePct?: number | null }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] tracking-tight">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
      {typeof changePct === 'number' && (
        <span className={cn(changePct >= 0 ? 'text-success' : 'text-destructive')}>
          {changePct >= 0 ? '+' : ''}
          {changePct.toFixed(2)}%
        </span>
      )}
    </span>
  );
}

export function MarketTicker() {
  const { data } = useMarketTicker();

  return (
    <div className="flex h-7 items-center gap-4 overflow-x-auto border-b border-border bg-secondary/40 px-5 text-muted-foreground no-scrollbar">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Marchés · Live
      </span>
      {data ? (
        <>
          {data.eurUsd.value !== null ? (
            <TickerItem label="EUR/USD" value={data.eurUsd.value.toFixed(4)} changePct={data.eurUsd.changePct} />
          ) : (
            <TickerItem label="EUR/USD" value="indisponible" />
          )}
          <TickerItem label="ATLAS · Encours" value={formatCurrency(data.aum.value)} />
          <TickerItem label="ATLAS · Opérations actives" value={String(data.activeDeals.value)} />
        </>
      ) : (
        <span className="text-[11px]">Chargement…</span>
      )}
    </div>
  );
}
