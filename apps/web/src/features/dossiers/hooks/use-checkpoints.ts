import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectCheckpoint } from '@/types';

export function useCheckpoints(dealId: string) {
  return useQuery({
    queryKey: ['checkpoints', dealId],
    queryFn: () => api.get<ProjectCheckpoint[]>(`/deals/${dealId}/checkpoints`),
  });
}

export interface CreateCheckpointPayload {
  travauxBudgetInitial?: number;
  travauxDepensesADate?: number;
  travauxTermines?: boolean;
  commercialisationLancee?: boolean;
  pourcentageVendu?: number;
  prixVenteInitialPrevu?: number;
  prixVenteActualise?: number;
  prixVenteReelADate?: number;
  atterrissagePrevu?: string;
  notes?: string;
}

export function useCreateCheckpoint(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCheckpointPayload) => api.post<ProjectCheckpoint>(`/deals/${dealId}/checkpoints`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints', dealId] });
      // checkpointHealth et durationTargetValidated (spec ATLAS v2, A.3) sont calculés dans la réponse de la fiche dossier, pas dans celle-ci — sans cette invalidation, la bannière "Durée cible dépassée" de Signaux & causes reste affichée jusqu'au prochain rechargement.
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', dealId] });
    },
  });
}

export function useUpdateCheckpoint(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ checkpointId, ...payload }: CreateCheckpointPayload & { checkpointId: string }) =>
      api.patch<ProjectCheckpoint>(`/deals/${dealId}/checkpoints/${checkpointId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints', dealId] });
      queryClient.invalidateQueries({ queryKey: ['field-changes', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', dealId] });
    },
  });
}
