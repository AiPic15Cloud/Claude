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

/** Ad hoc local file, not backed by a Document row — works even without a dealId (the general Agents IA page). */
export function useAgentChatWithFile(agentKey: string) {
  return useMutation({
    mutationFn: (payload: { history: ChatMessage[]; message: string; dealId?: string; file: File }) => {
      const form = new FormData();
      form.append('message', payload.message);
      form.append('history', JSON.stringify(payload.history));
      if (payload.dealId) form.append('dealId', payload.dealId);
      form.append('file', payload.file);
      return api.post<ChatResponse>(`/agents/${agentKey}/chat-with-file`, form);
    },
  });
}

export function isAgentUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}
