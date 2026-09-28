import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DealDocumentRequest } from '@/types';

export function useDocumentRequests(dealId: string) {
  return useQuery({
    queryKey: ['document-requests', dealId],
    queryFn: () => api.get<DealDocumentRequest[]>(`/deals/${dealId}/document-requests`),
  });
}

export function useCreateDocumentRequest(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { label: string; block?: string }) => api.post<DealDocumentRequest>(`/deals/${dealId}/document-requests`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-requests', dealId] }),
  });
}

export function useUpdateDocumentRequest(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...payload }: { requestId: string; status?: string; linkedDocumentId?: string }) =>
      api.patch<DealDocumentRequest>(`/deals/${dealId}/document-requests/${requestId}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-requests', dealId] }),
  });
}
