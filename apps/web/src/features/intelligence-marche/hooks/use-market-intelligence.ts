import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Article, ArticleCategory, NewsSource, PaginatedResult } from '@/types';

export function useSources() {
  return useQuery({
    queryKey: ['mi-sources'],
    queryFn: () => api.get<NewsSource[]>('/market-intelligence/sources'),
  });
}

export function useConnectors() {
  return useQuery({
    queryKey: ['mi-connectors'],
    queryFn: () => api.get<{ key: string; label: string }[]>('/market-intelligence/connectors'),
  });
}

export function useCreateSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; connector: string; url?: string; active?: boolean }) =>
      api.post<NewsSource>('/market-intelligence/sources', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-sources'] });
      queryClient.invalidateQueries({ queryKey: ['mi-articles'] });
    },
  });
}

export function useSetSourceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<NewsSource>(`/market-intelligence/sources/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mi-sources'] }),
  });
}

export function useFetchSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ created: number }>(`/market-intelligence/sources/${id}/fetch`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-sources'] });
      queryClient.invalidateQueries({ queryKey: ['mi-articles'] });
    },
  });
}

export function useCollectAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ sourcesCollected: number; created: number }>('/market-intelligence/sources/collect-all'),
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
