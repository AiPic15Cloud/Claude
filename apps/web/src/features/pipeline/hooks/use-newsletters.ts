import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NewsletterEntry } from '@/types';

export function useNewsletters() {
  return useQuery({
    queryKey: ['newsletters'],
    queryFn: () => api.get<NewsletterEntry[]>('/deals/newsletters'),
  });
}

export function usePingNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => api.patch(`/deals/${dealId}/newsletter`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletters'] }),
  });
}
