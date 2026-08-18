import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface RatePoint {
  period: string;
  value: number;
}

interface RateHistory {
  oat10y: RatePoint[];
  ecbPolicyRate: RatePoint[];
  mortgageRate: RatePoint[];
}

export function useRateHistory() {
  return useQuery({
    queryKey: ['market-intelligence', 'rate-history'],
    queryFn: () => api.get<RateHistory>('/market-intelligence/rate-history'),
    staleTime: 30 * 60_000,
  });
}
