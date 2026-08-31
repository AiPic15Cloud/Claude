import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CompetitorProject, CompetitorProjectEvent } from '@/types';

export function useCompetitorProjects(entityId: string | null) {
  return useQuery({
    queryKey: ['competitor-projects', entityId],
    queryFn: () => api.get<CompetitorProject[]>(`/platforms/${entityId}/projects`),
    enabled: Boolean(entityId),
  });
}

/** Historique des projets concurrents (spec ATLAS v2, C.3). */
export function useCompetitorProjectEvents(entityId: string | null) {
  return useQuery({
    queryKey: ['competitor-project-events', entityId],
    queryFn: () => api.get<CompetitorProjectEvent[]>(`/platforms/${entityId}/project-events`),
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

function invalidateProjectQueries(queryClient: ReturnType<typeof useQueryClient>, entityId: string | null) {
  queryClient.invalidateQueries({ queryKey: ['competitor-projects', entityId] });
  queryClient.invalidateQueries({ queryKey: ['competitor-project-events', entityId] });
}

export function useCreateCompetitorProject(entityId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompetitorProjectInput) => api.post<CompetitorProject>(`/platforms/${entityId}/projects`, data),
    onSuccess: () => invalidateProjectQueries(queryClient, entityId),
  });
}

export function useUpdateCompetitorProject(entityId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CompetitorProjectInput> & { id: string }) =>
      api.patch<CompetitorProject>(`/platforms/${entityId}/projects/${id}`, data),
    onSuccess: () => invalidateProjectQueries(queryClient, entityId),
  });
}

export function useDeleteCompetitorProject(entityId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/platforms/${entityId}/projects/${id}`),
    onSuccess: () => invalidateProjectQueries(queryClient, entityId),
  });
}
