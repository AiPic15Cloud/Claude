import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MilestoneStatus, PortfolioMilestone, ProjectProgress } from '@/types';

export function useMilestones(dealId: string) {
  return useQuery({
    queryKey: ['milestones', dealId],
    queryFn: () => api.get<PortfolioMilestone[]>(`/deals/${dealId}/milestones`),
    enabled: Boolean(dealId),
  });
}

export function useMilestoneProgress(dealId: string) {
  return useQuery({
    queryKey: ['milestones', dealId, 'progress'],
    queryFn: () => api.get<ProjectProgress>(`/deals/${dealId}/milestones/progress`),
    enabled: Boolean(dealId),
  });
}

export interface CreateMilestonePayload {
  label: string;
  description?: string;
  targetDate?: string;
  blocking?: boolean;
  order?: number;
}

export interface UpdateMilestonePayload extends Partial<CreateMilestonePayload> {
  status?: MilestoneStatus;
}

export function useCreateMilestone(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMilestonePayload) => api.post<PortfolioMilestone>(`/deals/${dealId}/milestones`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', dealId] });
      queryClient.invalidateQueries({ queryKey: ['milestones', dealId, 'progress'] });
    },
  });
}

export function useUpdateMilestone(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateMilestonePayload) =>
      api.patch<PortfolioMilestone>(`/deals/${dealId}/milestones/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', dealId] });
      queryClient.invalidateQueries({ queryKey: ['milestones', dealId, 'progress'] });
    },
  });
}

export function useDeleteMilestone(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/deals/${dealId}/milestones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', dealId] });
      queryClient.invalidateQueries({ queryKey: ['milestones', dealId, 'progress'] });
    },
  });
}

export function useReorderMilestones(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.patch<void>(`/deals/${dealId}/milestones/reorder`, { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', dealId] });
      queryClient.invalidateQueries({ queryKey: ['milestones', dealId, 'progress'] });
    },
  });
}
