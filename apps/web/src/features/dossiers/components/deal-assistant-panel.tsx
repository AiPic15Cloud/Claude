import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAgentsList } from '@/features/agents/hooks/use-agents';
import { AgentChatPanel } from '@/features/agents/components/agent-chat-panel';
import { Skeleton } from '@/components/ui/skeleton';

export function DealAssistantPanel({ dealId }: { dealId: string }) {
  const { data: agents = [], isLoading } = useAgentsList();
  const [agentKey, setAgentKey] = useState('analyst');

  useEffect(() => {
    if (!isLoading && agents.length > 0 && !agents.some((a) => a.key === agentKey)) {
      setAgentKey(agents[0].key);
    }
  }, [agents, isLoading, agentKey]);

  const selected = agents.find((a) => a.key === agentKey);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Agent</Label>
        <Select value={agentKey} onValueChange={setAgentKey}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {agents.map((a) => (
              <SelectItem key={a.key} value={a.key}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{selected && <AgentChatPanel agent={selected} dealId={dealId} />}</div>
    </div>
  );
}
