import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Tag } from '@/types';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<Tag[]>('/tags'),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; color?: string }) => api.post<Tag>('/tags', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}
