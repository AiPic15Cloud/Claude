import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface BuildingPermitsPoint {
  period: string;
  value: number;
}

export function useBuildingPermitsHistory() {
  return useQuery({
    queryKey: ['market-intelligence', 'building-permits-history'],
    queryFn: () => api.get<BuildingPermitsPoint[]>('/market-intelligence/building-permits-history'),
    staleTime: 30 * 60_000,
  });
}
