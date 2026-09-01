import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Activity } from '@/types';

export function useDealActivities(dealId: string) {
  return useQuery({
    queryKey: ['activities', dealId],
    queryFn: () => api.get<Activity[]>(`/deals/${dealId}/activities`),
  });
}
