import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DealEntityLink, DealEntityRole } from '@/types';

export function useDealEntities(dealId: string) {
  return useQuery({
    queryKey: ['deal-entities', dealId],
    queryFn: () => api.get<DealEntityLink[]>(`/deals/${dealId}/entities`),
  });
}

export function useLinkDealEntity(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { entityId: string; role: DealEntityRole }) =>
      api.post<DealEntityLink>(`/deals/${dealId}/entities`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-entities', dealId] }),
  });
}

export function useUnlinkDealEntity(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => api.delete(`/deals/${dealId}/entities/${linkId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal-entities', dealId] }),
  });
}
