import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EntitySummary, EvidenceLevel, GraphEntity, GraphEntityDetail, GraphEntityType, GraphPayload, RelationshipTypeOption } from '@/types';

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

/** Fiche contrepartie enrichie (spec ATLAS v2, B.3) — requêtes déterministes du Knowledge Graph v2. */
export function useEntitySummary(entityId: string | null) {
  return useQuery({
    queryKey: ['entity-summary', entityId],
    queryFn: () => api.get<EntitySummary>(`/entities/${entityId}/summary`),
    enabled: Boolean(entityId),
  });
}

export function useRelationshipTypes() {
  return useQuery({
    queryKey: ['relationship-types'],
    queryFn: () => api.get<RelationshipTypeOption[]>('/relationship-types'),
    staleTime: Infinity,
  });
}

export interface CreateRelationshipPayload {
  sourceEntityId: string;
  targetEntityId: string;
  typeKey: string;
  amount?: number;
  percentage?: number;
  evidenceLevel: EvidenceLevel;
  evidenceSource: string;
  evidenceReference?: string;
  evidenceNote?: string;
}

/** Knowledge Graph v2 (B.2/B.3) — remplace l'ancien useCreateRelation (mort, jamais appelé), dont la route v1 ne portait ni preuve ni les types Groupe économique/Caution partagée nécessaires à B.3. */
export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRelationshipPayload) => api.post('/relationships', payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entity-summary', variables.sourceEntityId] });
      queryClient.invalidateQueries({ queryKey: ['entity-summary', variables.targetEntityId] });
    },
  });
}
