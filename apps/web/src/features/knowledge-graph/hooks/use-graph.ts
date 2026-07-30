import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GraphEntity, GraphEntityDetail, GraphEntityType, GraphPayload } from '@/types';

export function useGraph(types?: GraphEntityType[]) {
  const query = types?.length ? `?types=${types.join(',')}` : '';
  return useQuery({
    queryKey: ['graph', types],
    queryFn: () => api.get<GraphPayload>(`/graph${query}`),
  });
}

export function useEntities(params: { type?: GraphEntityType; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  const qs = query.toString();
  return useQuery({
    queryKey: ['graph-entities', params],
    queryFn: () => api.get<GraphEntity[]>(`/graph/entities${qs ? `?${qs}` : ''}`),
  });
}

export function useEntity(id: string | null) {
  return useQuery({
    queryKey: ['graph-entity', id],
    queryFn: () => api.get<GraphEntityDetail>(`/graph/entities/${id}`),
    enabled: Boolean(id),
  });
}

export interface CreateEntityPayload {
  type: GraphEntityType;
  name: string;
  description?: string;
  website?: string;
  city?: string;
  metadata?: Record<string, unknown>;
  contactName?: string;
  email?: string;
  phone?: string;
}

export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEntityPayload) => api.post<GraphEntity>('/graph/entities', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph-entities'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<CreateEntityPayload>) =>
      api.patch<GraphEntity>(`/graph/entities/${id}`, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['graph-entities'] });
      queryClient.invalidateQueries({ queryKey: ['graph-entity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/graph/entities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph-entities'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

export function useCreateRelation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fromEntityId: string; toEntityId: string; type: string; label?: string }) =>
      api.post('/graph/relations', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['graph'] }),
  });
}
