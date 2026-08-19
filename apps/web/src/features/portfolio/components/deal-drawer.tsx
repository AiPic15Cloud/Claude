import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpRight, MapPin, Loader2, Send } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StageBadge, TypeBadge, ScoreBadge, RiskScoreBadge } from './deal-badges';
import { TagBadge } from './tag-badge';
import { RepaymentsPanel } from '@/features/dossiers/components/repayments-panel';
import { useDeal, useAddNote } from '../hooks/use-deals';
import { formatCurrency, formatDate } from '@/lib/format';
import { PRIORITY_LABELS } from '@/types';

interface DealDrawerProps {
  dealId: string | null;
  onClose: () => void;
}

export function DealDrawer({ dealId, onClose }: DealDrawerProps) {
  const { data: deal, isLoading } = useDeal(dealId);
  const addNote = useAddNote();
  const [noteContent, setNoteContent] = useState('');

  const submitNote = () => {
    if (!dealId || !noteContent.trim()) return;
    addNote.mutate(
      { dealId, content: noteContent.trim() },
      { onSuccess: () => setNoteContent('') },
    );
  };

  return (
    <Sheet open={Boolean(dealId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        {isLoading || !deal ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{deal.reference}</span>
                  <TypeBadge type={deal.type} />
                </div>
                <Link to={`/deals/${deal.id}`} className="flex items-center gap-1 text-primary hover:underline">
                  Dossier complet <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <SheetTitle>{deal.name}</SheetTitle>
              <div className="flex items-center gap-2">
                <StageBadge stage={deal.stage} />
                <ScoreBadge score={deal.atlasScore} />
                <RiskScoreBadge score={deal.riskScore} previousScore={deal.riskScorePrevious} />
                {deal.city && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {deal.city}
                  </span>
                )}
              </div>
              {deal.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {deal.tags.map(({ tag }) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
              )}
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="repayments">Remboursements</TabsTrigger>
                <TabsTrigger value="notes">Notes ({deal.notes.length})</TabsTrigger>
                <TabsTrigger value="tasks">Tâches ({deal.tasks.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({deal.documents.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex flex-col gap-4">
                {deal.description && <p className="text-sm text-muted-foreground">{deal.description}</p>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Montant cible</p>
                    <p className="text-sm font-semibold">{formatCurrency(deal.amountTarget)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Collecté</p>
                    <p className="text-sm font-semibold">{formatCurrency(deal.amountRaised)}</p>
                  </div>
                  {deal.interestRate && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Taux</p>
                      <p className="text-sm font-semibold">{deal.interestRate}%</p>
                    </div>
                  )}
                  {deal.durationMonths && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Durée</p>
                      <p className="text-sm font-semibold">{deal.durationMonths} mois</p>
                    </div>
                  )}
                  {deal.startDate && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Début</p>
                      <p className="text-sm font-semibold">{formatDate(deal.startDate)}</p>
                    </div>
                  )}
                  {deal.endDate && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Échéance</p>
                      <p className="text-sm font-semibold">{formatDate(deal.endDate)}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Créé par</span>
                  <span className="font-medium">
                    {deal.createdBy ? `${deal.createdBy.firstName} ${deal.createdBy.lastName}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assigné à</span>
                  <span className="font-medium">
                    {deal.assignedTo ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}` : 'Non assigné'}
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="repayments">
                <RepaymentsPanel dealId={deal.id} />
              </TabsContent>

              <TabsContent value="notes" className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="Ajouter une note…"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                  />
                  <Button size="sm" className="self-end" onClick={submitNote} disabled={!noteContent.trim() || addNote.isPending}>
                    {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Publier
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  {deal.notes.length === 0 && <p className="text-xs text-muted-foreground">Aucune note</p>}
                  {deal.notes.map((note) => (
                    <div key={note.id} className="flex gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">
                          {note.author ? `${note.author.firstName[0]}${note.author.lastName[0]}` : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 rounded-md bg-secondary/50 p-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">
                            {note.author ? `${note.author.firstName} ${note.author.lastName}` : 'Utilisateur'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                        <p className="mt-1 text-sm">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="flex flex-col gap-2">
                {deal.tasks.length === 0 && <p className="text-xs text-muted-foreground">Aucune tâche</p>}
                {deal.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className={`text-sm ${task.done ? 'text-muted-foreground line-through' : ''}`}>{task.title}</span>
                    <span className="text-xs text-muted-foreground">{PRIORITY_LABELS[task.priority]}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="documents" className="flex flex-col gap-2">
                {deal.documents.length === 0 && <p className="text-xs text-muted-foreground">Aucun document</p>}
                {deal.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span className="truncate">{doc.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(doc.size / 1024)} Ko</span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
