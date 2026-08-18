import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ConstructionCostIndexPoint {
  period: string;
  value: number;
}

export function useConstructionCostIndexHistory() {
  return useQuery({
    queryKey: ['market-intelligence', 'construction-cost-index-history'],
    queryFn: () => api.get<ConstructionCostIndexPoint[]>('/market-intelligence/construction-cost-index-history'),
    staleTime: 30 * 60_000,
  });
}
