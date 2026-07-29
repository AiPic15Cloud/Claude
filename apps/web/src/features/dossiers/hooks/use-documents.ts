import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DocumentFile } from '@/types';

export function useDocuments(dealId: string) {
  return useQuery({
    queryKey: ['documents', dealId],
    queryFn: () => api.get<DocumentFile[]>(`/deals/${dealId}/documents`),
  });
}

export function useUploadDocument(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<DocumentFile>(`/deals/${dealId}/documents`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', dealId] });
      // Documentation is one of the ATLAS Score factors — keep the score
      // tab and any deal summary that shows the document count in sync.
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', dealId] });
    },
  });
}

export function useDeleteDocument(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.delete(`/deals/${dealId}/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', dealId] });
    },
  });
}

export function useDownloadDocument(dealId: string) {
  return useMutation({
    mutationFn: async (doc: DocumentFile) => {
      const { url } = await api.get<{ url: string }>(`/deals/${dealId}/documents/${doc.id}/url`);
      const blob = await api.getBlob(url);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = doc.name;
      link.click();
      URL.revokeObjectURL(objectUrl);
    },
  });
}
