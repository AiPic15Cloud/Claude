import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentsList } from './hooks/use-agents';
import { AgentChatPanel } from './components/agent-chat-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

export function AgentsPage() {
  const { data: agents = [], isLoading } = useAgentsList();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedKey && agents.length > 0) setSelectedKey(agents[0].key);
  }, [agents, selectedKey]);

  const selected = agents.find((a) => a.key === selectedKey);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-5">
      <PageHeader
        title="Agents IA"
        description="Sept agents spécialisés, chacun avec son propre prompt système. Nécessite une clé Anthropic côté serveur."
      />

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[16rem_1fr]">
        <Card className="flex flex-col gap-1 overflow-y-auto p-2">
          {isLoading && Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          {agents.map((agent) => (
            <button
              key={agent.key}
              onClick={() => setSelectedKey(agent.key)}
              className={cn(
                'flex items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors',
                selectedKey === agent.key ? 'bg-primary/10 text-primary' : 'hover:bg-accent',
              )}
            >
              <Bot className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.description}</p>
              </div>
            </button>
          ))}
        </Card>

        <div className="overflow-hidden">{selected && <AgentChatPanel agent={selected} />}</div>
      </div>
    </div>
  );
}
