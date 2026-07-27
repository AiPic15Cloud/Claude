import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Article, ArticleCategory, ConnectorInfo, NewsSource, PaginatedResult } from '@/types';

export function useConnectors() {
  return useQuery({
    queryKey: ['mi-connectors'],
    queryFn: () => api.get<ConnectorInfo[]>('/market-intelligence/connectors'),
    staleTime: Infinity,
  });
}

export function useSources() {
  return useQuery({
    queryKey: ['mi-sources'],
    queryFn: () => api.get<NewsSource[]>('/market-intelligence/sources'),
  });
}

export function useCreateSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; connector: string; url?: string }) =>
      api.post<NewsSource>('/market-intelligence/sources', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mi-sources'] }),
  });
}

export function useTriggerFetch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => api.post<{ created: number }>(`/market-intelligence/sources/${sourceId}/fetch`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-articles'] });
      queryClient.invalidateQueries({ queryKey: ['mi-sources'] });
    },
  });
}

export function useArticles(params: { category?: ArticleCategory; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);
  const qs = query.toString();
  return useQuery({
    queryKey: ['mi-articles', params],
    queryFn: () => api.get<PaginatedResult<Article>>(`/market-intelligence/articles${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      sourceId: string;
      title: string;
      summary?: string;
      url?: string;
      category?: ArticleCategory;
      publishedAt?: string;
    }) => api.post<Article>('/market-intelligence/articles', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mi-articles'] }),
  });
}
