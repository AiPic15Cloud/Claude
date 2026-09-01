import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AgentHistoryMessage, AgentInfo } from '@/types';

export function useAgentsList() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<AgentInfo[]>('/agents'),
    staleTime: Infinity,
  });
}

// The full Assistant IA thread already recorded for this dossier — every
// agent's replies and the Devil's Advocate's, in send order — so reopening
// the tab (or a page refresh) doesn't lose analyses that took real API
// spend and reasoning to produce.
export function useAgentMessages(dealId?: string) {
  return useQuery({
    queryKey: ['agent-messages', dealId],
    queryFn: () => api.get<AgentHistoryMessage[]>(`/agents/messages?dealId=${dealId}`),
    enabled: !!dealId,
    staleTime: 0,
  });
}
