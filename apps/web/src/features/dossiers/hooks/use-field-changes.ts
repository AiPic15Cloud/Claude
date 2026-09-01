import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FieldChange } from '@/types';

export function useDealFieldChanges(dealId: string) {
  return useQuery({
    queryKey: ['field-changes', dealId],
    queryFn: () => api.get<FieldChange[]>(`/deals/${dealId}/field-changes`),
  });
}
