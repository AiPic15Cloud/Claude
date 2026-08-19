import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CheckCompanyResult {
  status: 'actif' | 'procedure_collective' | 'fermee' | null;
  changed: boolean;
}

export function useCheckCompany(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CheckCompanyResult>(`/deals/${dealId}/check-company`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
