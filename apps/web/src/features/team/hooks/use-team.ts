import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Role, TeamMember, WorkspaceScope } from '@/types';

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => api.get<TeamMember[]>('/users'),
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; password: string; firstName: string; lastName: string; role: Role; workspaceScope: WorkspaceScope }) =>
      api.post<TeamMember>('/users', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useUpdateTeamMemberAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...payload }: { userId: string; role: Role; workspaceScope: WorkspaceScope }) =>
      api.patch<TeamMember>(`/users/${userId}/access`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });
}
