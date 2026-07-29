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
  prixVenteReelADate?: number;
  atterrissagePrevu?: string;
  notes?: string;
}

export function useCreateCheckpoint(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCheckpointPayload) => api.post<ProjectCheckpoint>(`/deals/${dealId}/checkpoints`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkpoints', dealId] }),
  });
}
