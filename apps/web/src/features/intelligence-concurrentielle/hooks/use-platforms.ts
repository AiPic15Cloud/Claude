import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Article, GraphEntity, GraphEntityDetail } from '@/types';

export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: () => api.get<GraphEntity[]>('/platforms'),
  });
}

export function usePlatformProfile(id: string | null) {
  return useQuery({
    queryKey: ['platform', id],
    queryFn: () => api.get<GraphEntityDetail & { recentArticles: Article[] }>(`/platforms/${id}`),
    enabled: Boolean(id),
  });
}
