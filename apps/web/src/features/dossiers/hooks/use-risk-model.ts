import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RiskMethodology, RiskModelValidation } from '@/types';

export function useRiskMethodology() {
  return useQuery({
    queryKey: ['risk-model', 'methodology'],
    queryFn: () => api.get<RiskMethodology>('/risk-model/methodology'),
    staleTime: Infinity,
  });
}

export function useRiskModelValidation() {
  return useQuery({
    queryKey: ['risk-model', 'validation'],
    queryFn: () => api.get<RiskModelValidation>('/risk-model/validation'),
  });
}
