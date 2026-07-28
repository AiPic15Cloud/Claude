import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CommitteeStatus, Deal, PaginatedResult, PipelineEntry, PipelineSummary } from '@/types';
import type { CreateDealPayload } from '@/features/portfolio/hooks/use-deals';

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
  feesRate?: number;
  committee?: CommitteeStatus;
  decision?: string;
}

function invalidatePipeline(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['pipeline'] });
  queryClient.invalidateQueries({ queryKey: ['fees'] });
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

export function useConvertPipelineEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & CreateDealPayload) =>
      api.post<{ deal: Deal; pipelineEntry: PipelineEntry }>(`/pipeline/${id}/convert`, payload),
    onSuccess: () => {
      invalidatePipeline(queryClient);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['cockpit'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
  });
}
