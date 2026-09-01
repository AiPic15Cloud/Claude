import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alert } from '@/types';

export function useAlerts(unreadOnly = false) {
  return useQuery({
    queryKey: ['alerts', { unreadOnly }],
    queryFn: () => api.get<Alert[]>(`/alerts${unreadOnly ? '?unreadOnly=true' : ''}`),
    refetchInterval: 60_000,
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Alert>(`/alerts/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
    },
  });
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/alerts/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
    },
  });
}
