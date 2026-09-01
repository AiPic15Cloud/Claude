import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Article, GraphEntity, GraphEntityDetail } from '@/types';

export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: () => api.get<GraphEntity[]>('/platforms'),
  });
}

export interface PlatformsSyncResult {
  synced: number;
  source: string;
  fetchedAt: string;
  degraded: boolean;
}

export function useSyncPlatforms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<PlatformsSyncResult>('/platforms/sync'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platforms'] }),
  });
}

export interface ApplyWatchlistResult {
  applied: number;
}

export function useApplyWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ApplyWatchlistResult>('/platforms/watchlist'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platforms'] }),
  });
}

export function usePlatformProfile(id: string | null) {
  return useQuery({
    queryKey: ['platform', id],
    queryFn: () => api.get<GraphEntityDetail & { recentArticles: Article[] }>(`/platforms/${id}`),
    enabled: Boolean(id),
  });
}
