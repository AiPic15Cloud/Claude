import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AgentInfo } from '@/types';

export function useAgentsList() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<AgentInfo[]>('/agents'),
    staleTime: Infinity,
  });
}
