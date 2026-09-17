import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrowdfundingPlatform, MarketObservationEvent, ProjectObservation, ProjectObservationEntityLink, ProjectObservationStatus } from '@/types';

export function useCrowdfundingPlatforms() {
  return useQuery({
    queryKey: ['crowdfunding-watch', 'platforms'],
    queryFn: () => api.get<CrowdfundingPlatform[]>('/crowdfunding-watch/platforms'),
  });
}

export function useProjectObservations(filters?: { sourceKey?: string; status?: ProjectObservationStatus }) {
  const params = new URLSearchParams();
  if (filters?.sourceKey) params.set('sourceKey', filters.sourceKey);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString();
  return useQuery({
    queryKey: ['crowdfunding-watch', 'observations', filters],
    queryFn: () => api.get<ProjectObservation[]>(`/crowdfunding-watch/observations${query ? `?${query}` : ''}`),
  });
}

export function useProjectObservation(id: string | null) {
  return useQuery({
    queryKey: ['crowdfunding-watch', 'observations', id],
    queryFn: () => api.get<ProjectObservation>(`/crowdfunding-watch/observations/${id}`),
    enabled: Boolean(id),
  });
}

export function useCrowdfundingWatchEvents() {
  return useQuery({
    queryKey: ['crowdfunding-watch', 'events'],
    queryFn: () => api.get<MarketObservationEvent[]>('/crowdfunding-watch/observations/events'),
  });
}

/** Synchronisation manuelle — enfile un cycle immédiat sur la file de détection du worker (spec §7), jamais exécuté dans le navigateur ni dans le processus web. */
export function useSyncCrowdfundingWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceKey?: string) =>
      api.post<{ queued: number }>(`/crowdfunding-watch/observations/sync${sourceKey ? `?sourceKey=${sourceKey}` : ''}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-watch'] });
    },
  });
}

export function useEntityLinks(status?: 'SUGGESTED' | 'CONFIRMED' | 'REJECTED') {
  return useQuery({
    queryKey: ['crowdfunding-watch', 'entity-links', status],
    queryFn: () => api.get<ProjectObservationEntityLink[]>(`/crowdfunding-watch/entity-links${status ? `?status=${status}` : ''}`),
  });
}

/** Collectes externes associées à un porteur Atlas (spec §6 — affiché sur la fiche de l'entité). */
export function useEntityLinksForEntity(entityId: string | null) {
  return useQuery({
    queryKey: ['crowdfunding-watch', 'entity-links', 'by-entity', entityId],
    queryFn: () => api.get<ProjectObservationEntityLink[]>(`/crowdfunding-watch/entity-links?entityId=${entityId}`),
    enabled: Boolean(entityId),
  });
}

export function useConfirmEntityLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/crowdfunding-watch/entity-links/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-watch'] });
    },
  });
}

export function useRejectEntityLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.patch(`/crowdfunding-watch/entity-links/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-watch'] });
    },
  });
}
