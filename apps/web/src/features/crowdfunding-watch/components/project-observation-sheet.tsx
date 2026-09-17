import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectObservation } from '../hooks/use-crowdfunding-watch';
import { EntityLinkPanel } from './entity-link-panel';
import { formatCurrency, formatDate } from '@/lib/format';
import { PROJECT_OBSERVATION_STATUS_LABELS } from '@/types';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? '—'}</span>
    </div>
  );
}

/** Fiche projet (spec §6) — dates séparées, historique et panneau de rapprochement porteur Atlas. */
export function ProjectObservationSheet({ observationId, onClose }: { observationId: string | null; onClose: () => void }) {
  const { data: observation, isLoading } = useProjectObservation(observationId);

  return (
    <Sheet open={Boolean(observationId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="overflow-y-auto">
        {isLoading && <Skeleton className="h-96 w-full" />}
        {observation && (
          <>
            <SheetHeader>
              <SheetTitle>{observation.projectName}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-5 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{PROJECT_OBSERVATION_STATUS_LABELS[observation.status]}</Badge>
                {observation.platform && <Badge variant="secondary">{observation.platform.platformName}</Badge>}
                {observation.isBaseline && <Badge variant="outline">État initial (jamais notifié)</Badge>}
                <a href={observation.projectUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                  Voir la source ↗
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3">
                <Field label="Opérateur (brut)" value={observation.operatorRaw} />
                <Field label="Localisation" value={observation.location} />
                <Field label="Montant cible" value={observation.amountTarget !== null ? formatCurrency(observation.amountTarget) : null} />
                <Field label="Taux" value={observation.ratePct !== null ? `${observation.ratePct}%` : null} />
                <Field label="Durée" value={observation.durationMonths !== null ? `${observation.durationMonths} mois` : null} />
                <Field label="Segment ATLAS" value={observation.atlasSegment ? `${observation.atlasSegment} (${observation.mappingConfidence})` : observation.sourceCategory} />
              </div>

              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                <p className="text-xs font-medium text-foreground">Dates (conservées séparément — spec §2)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Field label="Publication" value={observation.publishedAt ? formatDate(observation.publishedAt) : null} />
                  <Field label="Ouverture annoncée" value={observation.announcedOpeningAt ? formatDate(observation.announcedOpeningAt) : null} />
                  <Field label="Ouverture effective" value={observation.effectiveOpeningAt ? formatDate(observation.effectiveOpeningAt) : null} />
                  <Field label="Première détection" value={formatDate(observation.firstDetectedAt)} />
                  <Field label="Dernière vérif. réussie" value={observation.lastSuccessAt ? formatDate(observation.lastSuccessAt) : null} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-foreground">Porteur Atlas — rapprochement</p>
                <EntityLinkPanel links={observation.entityLinks ?? []} enrichedAt={observation.enrichedAt} />
              </div>

              {observation.snapshots && observation.snapshots.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-foreground">Historique des changements ({observation.snapshots.length})</p>
                  <div className="flex flex-col gap-1">
                    {observation.snapshots.slice(0, 10).map((snapshot) => (
                      <div key={snapshot.id} className="flex items-center justify-between border-b border-border py-1 text-xs text-muted-foreground last:border-0">
                        <span>Changement détecté</span>
                        <span>{formatDate(snapshot.observedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
