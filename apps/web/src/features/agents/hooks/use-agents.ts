import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { AgentInfo, ChatMessage, ChatResponse } from '@/types';

export function useAgentsList() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<AgentInfo[]>('/agents'),
    staleTime: Infinity,
  });
}

export function useAgentChat(agentKey: string) {
  return useMutation({
    mutationFn: (payload: { messages: ChatMessage[]; dealId?: string; documentId?: string }) =>
      api.post<ChatResponse>(`/agents/${agentKey}/chat`, payload),
  });
}

export function isAgentUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}
