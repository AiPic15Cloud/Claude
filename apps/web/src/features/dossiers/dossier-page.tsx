import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Trash2, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeal, useDeleteDeal } from '@/features/portfolio/hooks/use-deals';
import {
  StageBadge,
  TypeBadge,
  CheckpointHealthBadge,
  RepaidBadge,
  RecoveryStatusBadge,
  PorteurMonitoringBadge,
} from '@/features/portfolio/components/deal-badges';
import { TagBadge } from '@/features/portfolio/components/tag-badge';
import { useGuarantees } from './hooks/use-guarantees';
import { useDealRisk } from './hooks/use-risk';
import { useCreateCostLineItem } from './hooks/use-cost-line-items';
import { useDealTasks } from '@/features/tasks/use-tasks';
import { TaskListCard } from '@/features/cockpit/components/task-list-card';
import { RiskAtlasCard } from './components/risk-atlas-card';
import { ProjectCommandHeader } from './components/project-command-header';
import { DealStageTimeline } from './components/deal-stage-timeline';
import { LoanLifecycleTimeline } from './components/loan-lifecycle-timeline';
import { LoanExtensionDialog } from './components/loan-extension-dialog';
import { ActivityLogPanel } from './components/activity-log-panel';
import { FieldHistoryPanel } from './components/field-history-panel';
import { ValidationBadge } from './components/validation-badge';
import { EditDealDialog } from './components/edit-deal-dialog';
import { ExtendDeadlineDialog } from './components/extend-deadline-dialog';
import { MiseEnDemeureDialog } from './components/mise-en-demeure-dialog';
import { GuaranteesPanel } from './components/guarantees-panel';
import { RiskDataCard } from './components/risk-data-card';
import { CompanyMonitoringCard } from './components/company-monitoring-card';
import { RepaymentsPanel } from './components/repayments-panel';
import { NotesPanel } from './components/notes-panel';
import { FinancialModelPanel, type FinancialModelFormValues } from './components/financial-model-panel';
import { CheckpointsPanel } from './components/checkpoints-panel';
import { DocumentsPanel } from './components/documents-panel';
import { EntitiesPanel } from './components/entities-panel';
import { DealAssistantPanel } from './components/deal-assistant-panel';
import { DealPrintSheet } from './components/deal-print-sheet';
import { formatCurrency, formatDate } from '@/lib/format';
import { FreshnessBadge } from '@/components/ui/freshness-badge';
import { CrdDetailPopover } from './components/crd-detail-popover';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { GUARANTEE_TYPE_LABELS, isFinancedStage, type FinancialExtraction } from '@/types';

export function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id ?? null);
  const { data: guarantees = [] } = useGuarantees(id ?? '');
  const { data: dealTasks = [] } = useDealTasks(id ?? '');
  const { data: riskProfile } = useDealRisk(id ?? '');
  const guaranteeWarnings = guarantees.filter((g) => g.expiringSoon || g.validity === 'NON_VALIDE');
  const deleteDeal = useDeleteDeal();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [activeTab, setActiveTab] = useState('risk');
  const [financialPrefill, setFinancialPrefill] = useState<(Partial<FinancialModelFormValues> & { sourceDocumentId?: string }) | null>(null);

  const createCostLineItem = useCreateCostLineItem(id ?? '');

  const handleApplyExtraction = (extraction: FinancialExtraction) => {
    const prefill: Partial<FinancialModelFormValues> & { sourceDocumentId?: string } = { sourceDocumentId: extraction.documentId };
    if (extraction.surfaceM2 !== null) prefill.surfaceSqm = extraction.surfaceM2;
    if (extraction.prixSortieM2 !== null) prefill.sellingPricePerSqm = extraction.prixSortieM2;
    if (extraction.margePct !== null) prefill.targetMarginPct = extraction.margePct;
    if (extraction.prixAcquisitionM2 !== null && extraction.surfaceM2 !== null) {
      prefill.landPrice = Math.round(extraction.prixAcquisitionM2 * extraction.surfaceM2);
    }
    const notesParts = [`Chiffres extraits automatiquement du document « ${extraction.sourceDocument} » — à vérifier avant utilisation.`];
    if (extraction.notes) notesParts.push(extraction.notes);
    prefill.notes = notesParts.join(' ');

    // Le coût travaux extrait est un total (ou dérivé €/m²×surface), pas un
    // champ du formulaire "Hypothèses" — devient un poste "Travaux" libre,
    // au même titre que ceux saisis manuellement.
    const travauxAmount =
      extraction.montantTravaux ?? (extraction.coutTravauxM2 !== null && extraction.surfaceM2 !== null ? extraction.coutTravauxM2 * extraction.surfaceM2 : null);
    if (travauxAmount !== null && travauxAmount >= 0) {
      createCostLineItem.mutate({ label: 'Travaux (extrait du BP)', amount: Math.round(travauxAmount) });
    }

    setFinancialPrefill(prefill);
    setActiveTab('financial');
  };

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
    <>
    <div className="flex flex-col gap-5 print:hidden">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/portfolio">
            <ArrowLeft className="h-3.5 w-3.5" /> Portefeuille
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0 whitespace-nowrap">{deal.reference}</span>
              <TypeBadge type={deal.type} />
              <StageBadge stage={deal.stage} />
              <RepaidBadge repaid={deal.repaid} stage={deal.stage} />
              <RecoveryStatusBadge status={deal.recoveryStatus} />
              <PorteurMonitoringBadge status={deal.porteurMonitoringStatus} />
            </div>
            <h1 className="font-display mt-1 text-xl font-semibold tracking-tight">{deal.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {deal.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {deal.city}
                </span>
              )}
              {deal.tags.map(({ tag }) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
              <CheckpointHealthBadge health={deal.checkpointHealth} />
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Exporter en PDF
            </Button>
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
          </div>
        </div>
        {deleteDeal.isError && (
          <p className="mt-2 text-xs text-destructive">
            {deleteDeal.error instanceof ApiError ? deleteDeal.error.message : 'Une erreur est survenue lors de la suppression.'}
          </p>
        )}
      </div>

      <ProjectCommandHeader deal={deal} guaranteeWarnings={guaranteeWarnings} tasks={dealTasks} onOpenTasks={() => setActiveTab('tasks')} />

      {(deal.deadlineAlert?.level !== 'RAS' ||
        (deal.durationTargetAlert?.level !== 'RAS' && !deal.durationTargetValidated) ||
        guaranteeWarnings.length > 0) && (
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Signaux &amp; causes</h2>

      {deal.deadlineAlert && deal.deadlineAlert.level !== 'RAS' && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2.5 rounded-md border px-3 py-2 text-sm',
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

      {deal.durationTargetAlert && deal.durationTargetAlert.level !== 'RAS' && !deal.durationTargetValidated && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2.5 rounded-md border px-3 py-2 text-sm',
            deal.durationTargetAlert.level === 'URGENT'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-warning/30 bg-warning/10 text-warning',
          )}
        >
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', deal.durationTargetAlert.level === 'URGENT' ? 'bg-destructive' : 'bg-warning')}
          />
          <span className="font-medium">
            {deal.durationTargetAlert.stage === 'DEPASSEE' ? 'Durée cible dépassée' : `Durée cible dans J-${deal.durationTargetAlert.daysToTarget}`} —
          </span>
          <span className="flex-1">{deal.durationTargetAlert.actionLabel}</span>
        </div>
      )}

      {guaranteeWarnings.length > 0 && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2.5 rounded-md border px-3 py-2 text-sm',
            guaranteeWarnings.some((g) => g.validity === 'NON_VALIDE')
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-warning/30 bg-warning/10 text-warning',
          )}
        >
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              guaranteeWarnings.some((g) => g.validity === 'NON_VALIDE') ? 'bg-destructive' : 'bg-warning',
            )}
          />
          <span className="font-medium">Garantie à renouveler —</span>
          <span className="flex-1">
            {guaranteeWarnings
              .map((g) =>
                g.validity === 'NON_VALIDE'
                  ? `${GUARANTEE_TYPE_LABELS[g.type]} expirée`
                  : `${GUARANTEE_TYPE_LABELS[g.type]} (J-${g.daysToExpiry})`,
              )
              .join(' · ')}
          </span>
          <Button size="sm" variant="outline" onClick={() => setActiveTab('guarantees')}>
            Voir les garanties
          </Button>
        </div>
      )}
      </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isFinancedStage(deal.stage) ? (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Collecté</p>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(deal.amountRaised)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  Capital restant dû
                  <CrdDetailPopover
                    crdCapital={deal.crd ?? Number(deal.amountRaised)}
                    crdInteretsCourus={deal.crdInteretsCourus}
                    crdTotal={deal.crdTotal}
                    joursPenalisesRetard={deal.crdJoursPenalisesRetard}
                  />
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrency(deal.crdTotal ?? deal.crd ?? deal.amountRaised)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {deal.crdInteretsCourus != null
                    ? `dont ${formatCurrency(deal.crdInteretsCourus)} d'intérêts courus`
                    : "Intérêts non calculés — taux ou date de départ manquants"}
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
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
          </>
        )}
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

      {isFinancedStage(deal.stage) ? (
        <div className="flex flex-col gap-2">
          <LoanLifecycleTimeline dealId={deal.id} variant="full" />
          <div className="flex justify-end">
            <LoanExtensionDialog dealId={deal.id} dealName={deal.name} currentEndDate={deal.endDate ?? null} />
          </div>
        </div>
      ) : (
        <DealStageTimeline dealId={deal.id} currentStage={deal.stage} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="risk">Risque</TabsTrigger>
          <TabsTrigger value="notes">Notes ({deal.notes.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tâches ({dealTasks.filter((t) => !t.done).length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({deal.documents.length})</TabsTrigger>
          <TabsTrigger value="guarantees">Garanties</TabsTrigger>
          <TabsTrigger value="repayments">Remboursements</TabsTrigger>
          <TabsTrigger value="financial">Modèle financier</TabsTrigger>
          <TabsTrigger value="checkpoints">Suivi cible</TabsTrigger>
          <TabsTrigger value="entities">Intervenants</TabsTrigger>
          <TabsTrigger value="activity">Décisions</TabsTrigger>
          <TabsTrigger value="assistant">Assistant IA</TabsTrigger>
        </TabsList>

        <TabsContent value="risk">
          <RiskAtlasCard dealId={deal.id} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesPanel dealId={deal.id} notes={deal.notes} />
        </TabsContent>
        <TabsContent value="tasks">
          <TaskListCard
            title="Tâches"
            tasks={dealTasks}
            emptyLabel="Aucune tâche sur ce dossier"
            showDueDate
            quickAdd
            dealId={deal.id}
          />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsPanel dealId={deal.id} onApplyToFinancialModel={handleApplyExtraction} />
        </TabsContent>
        <TabsContent value="guarantees" className="flex flex-col gap-4">
          <GuaranteesPanel dealId={deal.id} />
          {riskProfile?.dataFreshness && riskProfile.dataFreshness.sources.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Fraîcheur des données externes ({riskProfile.dataFreshness.confidencePct} % à jour)
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {riskProfile.dataFreshness.sources.map((s) => (
                  <FreshnessBadge key={s.key} checkedAt={s.checkedAt} label={s.label} />
                ))}
              </div>
            </div>
          )}
          {deal.porteurSiren && (
            <CompanyMonitoringCard
              dealId={deal.id}
              siren={deal.porteurSiren}
              societe={deal.porteurSociete}
              status={deal.porteurMonitoringStatus}
              checkedAt={deal.porteurCheckedAt}
            />
          )}
          <RiskDataCard
            dealId={deal.id}
            hasCoords={Boolean(deal.lat && deal.lng)}
            hasPostcode={Boolean(deal.postcode)}
            riskDataCheckedAt={deal.riskDataCheckedAt}
            dpeCheckedAt={deal.dpeCheckedAt}
          />
        </TabsContent>
        <TabsContent value="repayments">
          <RepaymentsPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="financial">
          <FinancialModelPanel
            dealId={deal.id}
            dealInterestRate={deal.interestRate !== undefined && deal.interestRate !== null ? Number(deal.interestRate) : null}
            dealDurationMonths={deal.durationMonths ?? null}
            prefill={financialPrefill}
            onPrefillApplied={() => setFinancialPrefill(null)}
          />
        </TabsContent>
        <TabsContent value="checkpoints">
          <CheckpointsPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="entities">
          <EntitiesPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="activity" className="flex flex-col gap-4">
          <ActivityLogPanel dealId={deal.id} />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Historique des valeurs</h3>
              <ValidationBadge dealId={deal.id} entityType="Deal" />
            </div>
            <FieldHistoryPanel dealId={deal.id} />
          </div>
        </TabsContent>
        <TabsContent value="assistant" className="h-[32rem]">
          <DealAssistantPanel dealId={deal.id} />
        </TabsContent>
      </Tabs>
    </div>
    <DealPrintSheet deal={deal} guarantees={guarantees} />
    </>
  );
}
