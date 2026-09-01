import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface HousePriceIndexPoint {
  period: string;
  value: number;
}

export function useHousePriceIndexHistory() {
  return useQuery({
    queryKey: ['market-intelligence', 'house-price-index-history'],
    queryFn: () => api.get<HousePriceIndexPoint[]>('/market-intelligence/house-price-index-history'),
    staleTime: 30 * 60_000,
  });
}
