import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeal, useDeleteDeal } from '@/features/portfolio/hooks/use-deals';
import { StageBadge, TypeBadge, ScoreBadge } from '@/features/portfolio/components/deal-badges';
import { TagBadge } from '@/features/portfolio/components/tag-badge';
import { ScoreBreakdownCard } from './components/score-breakdown-card';
import { EditDealDialog } from './components/edit-deal-dialog';
import { ExtendDeadlineDialog } from './components/extend-deadline-dialog';
import { MiseEnDemeureDialog } from './components/mise-en-demeure-dialog';
import { GuaranteesPanel } from './components/guarantees-panel';
import { RepaymentsPanel } from './components/repayments-panel';
import { NotesPanel } from './components/notes-panel';
import { FinancialModelPanel } from './components/financial-model-panel';
import { CheckpointsPanel } from './components/checkpoints-panel';
import { EntitiesPanel } from './components/entities-panel';
import { DealAssistantPanel } from './components/deal-assistant-panel';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id ?? null);
  const deleteDeal = useDeleteDeal();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = () => {
    if (!deal) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteDeal.mutate(deal.id, { onSuccess: () => navigate('/portfolio') });
  };

  if (isLoading || !deal) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/portfolio">
            <ArrowLeft className="h-3.5 w-3.5" /> Portefeuille
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{deal.reference}</span>
              <TypeBadge type={deal.type} />
              <StageBadge stage={deal.stage} />
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{deal.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {deal.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {deal.city}
                </span>
              )}
              {deal.tags.map(({ tag }) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <EditDealDialog deal={deal} />
            {confirmingDelete && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Annuler
              </Button>
            )}
            <Button
              size="sm"
              variant={confirmingDelete ? 'destructive' : 'outline'}
              className={confirmingDelete ? '' : 'text-destructive hover:text-destructive'}
              onClick={handleDelete}
              disabled={deleteDeal.isPending}
            >
              {deleteDeal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {confirmingDelete ? 'Confirmer la suppression' : 'Supprimer'}
            </Button>
            <ScoreBadge score={deal.atlasScore} />
          </div>
        </div>
        {deleteDeal.isError && (
          <p className="mt-2 text-xs text-destructive">
            {deleteDeal.error instanceof ApiError ? deleteDeal.error.message : 'Une erreur est survenue lors de la suppression.'}
          </p>
        )}
      </div>

      {deal.deadlineAlert && deal.deadlineAlert.level !== 'RAS' && (
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm',
            deal.deadlineAlert.level === 'URGENT'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-warning/30 bg-warning/10 text-warning',
          )}
        >
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', deal.deadlineAlert.level === 'URGENT' ? 'bg-destructive' : 'bg-warning')}
          />
          <span className="font-medium">
            {deal.deadlineAlert.daysToMax <= 0 ? 'Échéance dépassée' : `J-${deal.deadlineAlert.daysToMax}`} —
          </span>
          <span className="flex-1">{deal.deadlineAlert.actionLabel}</span>
          <MiseEnDemeureDialog dealId={deal.id} />
          <ExtendDeadlineDialog dealId={deal.id} dealName={deal.name} currentDateMax={deal.dateMax ?? null} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Montant cible</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(deal.amountTarget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Collecté</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(deal.amountRaised)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taux</p>
            <p className="text-lg font-semibold tabular-nums">{deal.interestRate ? `${deal.interestRate}%` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Échéance</p>
            <p className="text-lg font-semibold">{deal.endDate ? formatDate(deal.endDate) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="score">
        <TabsList>
          <TabsTrigger value="score">Score ATLAS</TabsTrigger>
          <TabsTrigger value="notes">Notes ({deal.notes.length})</TabsTrigger>
          <TabsTrigger value="guarantees">Garanties</TabsTrigger>
          <TabsTrigger value="repayments">Remboursements</TabsTrigger>
          <TabsTrigger value="financial">Modèle financier</TabsTrigger>
          <TabsTrigger value="checkpoints">Suivi cible</TabsTrigger>
          <TabsTrigger value="entities">Intervenants</TabsTrigger>
          <TabsTrigger value="assistant">Assistant IA</TabsTrigger>
        </TabsList>

        <TabsContent value="score">
          <ScoreBreakdownCard dealId={deal.id} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesPanel dealId={deal.id} notes={deal.notes} />
        </TabsContent>
        <TabsContent value="guarantees">
          <GuaranteesPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="repayments">
          <RepaymentsPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="financial">
          <FinancialModelPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="checkpoints">
          <CheckpointsPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="entities">
          <EntitiesPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="assistant" className="h-[32rem]">
          <DealAssistantPanel dealId={deal.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
