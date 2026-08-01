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
    <div className="flex flex-col gap-5 lg:h-[calc(100vh-8rem)]">
      <PageHeader
        title="Agents IA"
        description="Cinq agents spécialisés — dont Analyste, Juriste et Contrôleur pour la pré-analyse de dossier — chacun avec son propre prompt système. Nécessite une clé Anthropic côté serveur."
      />

      <div className="flex flex-col gap-4 lg:grid lg:flex-1 lg:grid-cols-[16rem_1fr] lg:overflow-hidden">
        {/* Mobile/tablet: a horizontal chip row keeps the picker from eating the viewport
            the way a full vertical list would — the chat below needs the room instead. */}
        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />)}
          {agents.map((agent) => (
            <button
              key={agent.key}
              onClick={() => setSelectedKey(agent.key)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                selectedKey === agent.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              {agent.name}
            </button>
          ))}
        </div>

        <Card className="hidden shrink-0 flex-col gap-1 overflow-y-auto p-2 lg:flex">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
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

        <div className="min-h-[32rem] flex-1 lg:min-h-0 lg:overflow-hidden">
          {selected && <AgentChatPanel agent={selected} />}
        </div>
      </div>
    </div>
  );
}
