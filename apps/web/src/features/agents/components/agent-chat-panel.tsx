import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Loader2, Paperclip, Send, Swords, User as UserIcon, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useDocuments } from '@/features/dossiers/hooks/use-documents';
import { isDocumentReadableByAgent } from '@/lib/document-support';
import { ChatMarkdown } from '@/components/chat-markdown';
import { useAgentMessages } from '../hooks/use-agents';
import type { AgentInfo, ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

interface DisplayMessage extends ChatMessage {
  /** Local-only tag for rendering — never sent to the API (see toApiMessages). */
  source?: 'devil';
}

function toApiMessages(messages: DisplayMessage[]): ChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

interface AgentChatPanelProps {
  agent: AgentInfo;
  dealId?: string;
  /** Preset prompts (e.g. "Préparer le comité") rendered as buttons above the input — sent immediately on click. */
  quickActions?: { label: string; prompt: string }[];
}

export function AgentChatPanel({ agent, dealId, quickActions }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  // Every analysis (and every Devil's Advocate challenge) run against a
  // dossier is recorded server-side — load it once so it survives a
  // navigation/refresh instead of only living in this component's state.
  const { data: history, isLoading: isLoadingHistory } = useAgentMessages(dealId);
  const hydratedRef = useRef(false);
  const [input, setInput] = useState('');
  const [attachedDocumentId, setAttachedDocumentId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showDossierPicker, setShowDossierPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isChallenging, setIsChallenging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  // isSending/isChallenging (React state) only reflect reality after the next
  // render — two send() calls fired back-to-back in the same tick (e.g. a
  // double Enter keypress) both read the pre-update value and both proceed.
  // This ref is mutated synchronously, so the second call sees it immediately.
  const sendingRef = useRef(false);
  // "Documents du dossier" only makes sense inside a deal's own chat — a standalone
  // /ai conversation has no dealId, hence no pre-existing document list to pick from.
  // The device-file attachment below works either way.
  const { data: documents = [] } = useDocuments(dealId ?? '');
  const readableDocuments = dealId ? documents.filter(isDocumentReadableByAgent) : [];
  const attachedDocument = documents.find((d) => d.id === attachedDocumentId);
  const sending = isSending || isChallenging;

  // Hydrate from server history exactly once per dossier — a second fetch
  // (refetch on window focus, etc.) must not clobber messages the user is
  // actively composing/streaming in this tab.
  useEffect(() => {
    hydratedRef.current = false;
  }, [dealId]);
  useEffect(() => {
    if (!history || hydratedRef.current) return;
    hydratedRef.current = true;
    if (history.length > 0) setMessages(history);
  }, [history]);

  const clearAttachment = () => {
    setAttachedDocumentId(null);
    setAttachedFile(null);
  };

  // Appends the delta to whichever message is currently last — used both for
  // the main reply and the devil's-advocate reply, since each starts by
  // pushing its own empty placeholder before streaming into it.
  const appendDelta = (delta: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      copy[lastIdx] = { ...copy[lastIdx], content: copy[lastIdx].content + delta };
      return copy;
    });
  };

  const dropEmptyPlaceholder = () => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === 'assistant' && last.content === '' ? prev.slice(0, -1) : prev;
    });
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    // The send button disables while sending, but Enter in the textarea
    // bypasses that — without this guard a double Enter mid-stream starts a
    // second request whose appendDelta races the first one onto the same
    // "last message" slot, interleaving both replies into garbled text.
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setError(null);
    const nextMessages: DisplayMessage[] = [...messages, { role: 'user', content: text }];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsSending(true);

    const file = attachedFile;
    const documentId = attachedDocumentId ?? undefined;
    clearAttachment();
    setShowAttachMenu(false);
    setShowDossierPicker(false);

    try {
      if (file) {
        const form = new FormData();
        form.append('message', text);
        form.append('history', JSON.stringify(toApiMessages(messages)));
        if (dealId) form.append('dealId', dealId);
        form.append('file', file);
        await api.postStream(`/agents/${agent.key}/chat-with-file`, form, appendDelta);
      } else {
        await api.postStream(`/agents/${agent.key}/chat`, { messages: toApiMessages(nextMessages), dealId, documentId }, appendDelta);
      }
    } catch (err) {
      dropEmptyPlaceholder();
      setError(err instanceof Error ? err.message : "Échec de l'envoi du message.");
    } finally {
      setIsSending(false);
      sendingRef.current = false;
    }
  };

  const challenge = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setError(null);
    setMessages((prev) => [...prev, { role: 'assistant', content: '', source: 'devil' }]);
    setIsChallenging(true);
    try {
      await api.postStream('/agents/devil/chat', { messages: toApiMessages(messages), dealId }, appendDelta);
    } catch (err) {
      dropEmptyPlaceholder();
      setError(err instanceof Error ? err.message : "Échec de l'analyse contradictoire.");
    } finally {
      setIsChallenging(false);
      sendingRef.current = false;
    }
  };

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    // Only stick to the bottom if the user was already there — otherwise a
    // reply streaming in mid-read keeps yanking them back down on every token.
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const lastMessage = messages[messages.length - 1];
  const lastIsAssistant = lastMessage?.role === 'assistant' && lastMessage.content !== '';
  const waitingForFirstToken = sending && lastMessage?.role === 'assistant' && lastMessage.content === '';

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
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div ref={messageListRef} className="flex min-h-48 flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-border bg-secondary/30 p-3">
          {dealId && isLoadingHistory && messages.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement de l'historique…
            </div>
          )}
          {!(dealId && isLoadingHistory) && messages.length === 0 && !error && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Posez une question à l'agent {agent.name}
              {dealId ? ' à propos de ce dossier' : ''}. Vous pouvez joindre un PDF ou Excel (business plan, comptes…) à
              analyser.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground',
                  m.source === 'devil' ? 'bg-destructive/10 text-destructive' : 'bg-muted',
                )}
              >
                {m.role === 'user' ? <UserIcon className="h-3.5 w-3.5" /> : m.source === 'devil' ? <Swords className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className="flex max-w-[85%] flex-col gap-1">
                {m.source === 'devil' && <span className="text-[0.65rem] font-medium uppercase tracking-wide text-destructive">Avocat du diable</span>}
                <div
                  className={cn(
                    'rounded-md px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                      : m.source === 'devil'
                        ? 'border border-destructive/30 bg-destructive/5'
                        : 'bg-background border border-border',
                  )}
                >
                  {m.role === 'assistant' ? <ChatMarkdown content={m.content} /> : m.content}
                </div>
              </div>
            </div>
          ))}
          {waitingForFirstToken && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {isChallenging ? "L'avocat du diable réfléchit…" : `${agent.name} réfléchit…`}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {lastIsAssistant && (
          <Button size="sm" variant="outline" className="self-start" onClick={challenge} disabled={sending}>
            <Swords className="h-3.5 w-3.5" />
            Challenger cette analyse
          </Button>
        )}

        {quickActions && quickActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {quickActions.map((qa) => (
              <Button key={qa.label} size="sm" variant="outline" onClick={() => send(qa.prompt)} disabled={sending}>
                {qa.label}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setAttachedFile(file);
                setAttachedDocumentId(null);
                setShowAttachMenu(false);
              }
              e.target.value = '';
            }}
          />

          {attachedFile || attachedDocument ? (
            <div className="flex items-center gap-2 self-start rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs">
              <Paperclip className="h-3 w-3 text-primary" />
              <span className="max-w-[16rem] truncate">{attachedFile?.name ?? attachedDocument?.name}</span>
              <button type="button" onClick={clearAttachment} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : showDossierPicker ? (
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(value) => {
                  setAttachedDocumentId(value);
                  setShowDossierPicker(false);
                }}
              >
                <SelectTrigger className="h-8 w-64 text-xs">
                  <SelectValue placeholder={readableDocuments.length ? 'Choisir un document…' : 'Aucun document PDF/Excel déposé'} />
                </SelectTrigger>
                <SelectContent>
                  {readableDocuments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => setShowDossierPicker(false)}>
                Annuler
              </Button>
            </div>
          ) : showAttachMenu ? (
            <div className="flex items-center gap-2 self-start">
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Depuis mon appareil
              </Button>
              {dealId && (
                <Button size="sm" variant="outline" onClick={() => setShowDossierPicker(true)}>
                  Depuis les documents du dossier
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowAttachMenu(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="self-start text-muted-foreground" onClick={() => setShowAttachMenu(true)}>
              <Paperclip className="h-3.5 w-3.5" />
              Joindre un document (PDF, Excel)
            </Button>
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
          <Button size="icon" onClick={() => send()} disabled={!input.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
