import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DataValidation } from '@/types';

export function useDealValidations(dealId: string) {
  return useQuery({
    queryKey: ['data-validations', dealId],
    queryFn: () => api.get<DataValidation[]>(`/deals/${dealId}/validations`),
  });
}

export function useValidateEntity(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityType: string) => api.post<DataValidation>(`/deals/${dealId}/validations/${entityType}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['data-validations', dealId] }),
  });
}
