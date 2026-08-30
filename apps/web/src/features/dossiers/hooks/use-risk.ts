import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DealRiskProfile, DealSurveillanceStatus, RiskOverrideRow, AnalystOverride, RiskTrajectoryPoint } from '@/types';

export function useDealRisk(dealId: string) {
  return useQuery({
    queryKey: ['risk', dealId],
    queryFn: () => api.get<DealRiskProfile>(`/deals/${dealId}/risk`),
  });
}

export function useRecomputeRisk(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DealRiskProfile>(`/deals/${dealId}/risk/recompute`),
    onSuccess: (data) => {
      queryClient.setQueryData(['risk', dealId], data);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['risk-history', dealId] });
    },
  });
}

export function useRiskHistory(dealId: string, days = 90) {
  return useQuery({
    queryKey: ['risk-history', dealId, days],
    queryFn: () => api.get<RiskTrajectoryPoint[]>(`/deals/${dealId}/risk/history?days=${days}`),
  });
}

export function useRiskOverrideHistory(dealId: string) {
  return useQuery({
    queryKey: ['risk-override-history', dealId],
    queryFn: () => api.get<{ riskOverrides: RiskOverrideRow[]; dealOverrides: AnalystOverride[] }>(`/deals/${dealId}/risk/override-history`),
  });
}

export function useSetAnalystOverride(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { overrideStatus: DealSurveillanceStatus; justification: string }) =>
      api.post(`/deals/${dealId}/risk/analyst-override`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk', dealId] });
      queryClient.invalidateQueries({ queryKey: ['risk-override-history', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useClearAnalystOverride(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/deals/${dealId}/risk/analyst-override`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk', dealId] });
      queryClient.invalidateQueries({ queryKey: ['risk-override-history', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
