import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface MarketTickerSummary {
  eurUsd: { value: number | null; changePct: number | null; degraded: boolean };
  aum: { value: number };
  activeDeals: { value: number };
  asOf: string;
}

export function useMarketTicker() {
  return useQuery({
    queryKey: ['market-ticker'],
    queryFn: () => api.get<MarketTickerSummary>('/market-ticker'),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}
