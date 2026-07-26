import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CommitteeStatus, PaginatedResult, PipelineEntry, PipelineSummary } from '@/types';

export function usePipelineEntries(committee?: CommitteeStatus) {
  return useQuery({
    queryKey: ['pipeline', committee],
    queryFn: () => api.get<PaginatedResult<PipelineEntry>>(`/pipeline?pageSize=200${committee ? `&committee=${committee}` : ''}`),
  });
}

export function usePipelineSummary() {
  return useQuery({
    queryKey: ['pipeline', 'summary'],
    queryFn: () => api.get<PipelineSummary>('/pipeline/summary'),
  });
}

export interface CreatePipelineEntryPayload {
  date: string;
  operator: string;
  typology?: string;
  source?: string;
  amount: number;
  margin?: number;
  committee?: CommitteeStatus;
  decision?: string;
}

function invalidatePipeline(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['pipeline'] });
}

export function useCreatePipelineEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePipelineEntryPayload) => api.post<PipelineEntry>('/pipeline', payload),
    onSuccess: () => invalidatePipeline(queryClient),
  });
}

export function useUpdatePipelineEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<CreatePipelineEntryPayload>) =>
      api.patch<PipelineEntry>(`/pipeline/${id}`, payload),
    onSuccess: () => invalidatePipeline(queryClient),
  });
}

export function useDeletePipelineEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pipeline/${id}`),
    onSuccess: () => invalidatePipeline(queryClient),
  });
}
