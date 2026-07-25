import { useState } from 'react';
import { AlertTriangle, Bot, Loader2, Send, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAgentChat, isAgentUnavailable } from '../hooks/use-agents';
import type { AgentInfo, ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

interface AgentChatPanelProps {
  agent: AgentInfo;
  dealId?: string;
}

export function AgentChatPanel({ agent, dealId }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const chat = useAgentChat(agent.key);

  const send = () => {
    if (!input.trim()) return;
    const nextMessages = [...messages, { role: 'user' as const, content: input.trim() }];
    setMessages(nextMessages);
    setInput('');
    chat.mutate(
      { messages: nextMessages, dealId },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
        },
      },
    );
  };

  const unavailable = chat.isError && isAgentUnavailable(chat.error);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>{agent.name}</CardTitle>
            <CardDescription>{agent.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex min-h-48 flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-border bg-secondary/30 p-3">
          {messages.length === 0 && !unavailable && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Posez une question à l'agent {agent.name}
              {dealId ? ' à propos de ce dossier' : ''}.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {m.role === 'user' ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={cn(
                  'max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap',
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border border-border',
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {chat.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {agent.name} réfléchit…
            </div>
          )}
          {unavailable && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span>
                Agents IA non configurés côté serveur. Définissez <code className="font-mono">ANTHROPIC_API_KEY</code>{' '}
                pour activer ce module.
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Votre message…"
            rows={2}
            className="flex-1"
          />
          <Button size="icon" onClick={send} disabled={!input.trim() || chat.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
