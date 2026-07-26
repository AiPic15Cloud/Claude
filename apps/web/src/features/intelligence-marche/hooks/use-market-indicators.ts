import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Indicator {
  value: number | null;
  previousValue: number | null;
  period: string | null;
}

interface MarketIndicators {
  inflationHicp: Indicator;
  oat10y: Indicator;
  euribor3m: Indicator;
}

export function useMarketIndicators() {
  return useQuery({
    queryKey: ['market-intelligence', 'indicators'],
    queryFn: () => api.get<MarketIndicators>('/market-intelligence/indicators'),
    staleTime: 30 * 60_000,
  });
}
