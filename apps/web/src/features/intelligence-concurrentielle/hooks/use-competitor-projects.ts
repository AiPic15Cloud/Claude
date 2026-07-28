import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CompetitorProject } from '@/types';

export function useCompetitorProjects(entityId: string | null) {
  return useQuery({
    queryKey: ['competitor-projects', entityId],
    queryFn: () => api.get<CompetitorProject[]>(`/platforms/${entityId}/projects`),
    enabled: Boolean(entityId),
  });
}

interface CompetitorProjectInput {
  name: string;
  status?: CompetitorProject['status'];
  targetAmount?: number;
  expectedDate?: string;
  url?: string;
  note?: string;
}

export function useCreateCompetitorProject(entityId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompetitorProjectInput) => api.post<CompetitorProject>(`/platforms/${entityId}/projects`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitor-projects', entityId] }),
  });
}

export function useUpdateCompetitorProject(entityId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CompetitorProjectInput> & { id: string }) =>
      api.patch<CompetitorProject>(`/platforms/${entityId}/projects/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitor-projects', entityId] }),
  });
}

export function useDeleteCompetitorProject(entityId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/platforms/${entityId}/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitor-projects', entityId] }),
  });
}
