import { Link } from 'react-router-dom';
import { Globe, Mail, MapPin, Phone, User, TriangleAlert } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEntity, useEntitySummary } from '../hooks/use-graph';
import { CreateEntityDialog } from './create-entity-dialog';
import { CreateRelationshipDialog } from './create-relationship-dialog';
import { CompetitorProjectsPanel } from '@/features/intelligence-concurrentielle/components/competitor-projects-panel';
import { PlatformStatsPanel } from '@/features/intelligence-concurrentielle/components/platform-stats-panel';
import type { PlatformMetadata } from '@/features/intelligence-concurrentielle/platform-metadata';
import { DEAL_ENTITY_ROLE_LABELS, GRAPH_ENTITY_TYPE_LABELS, RELATIONSHIP_COVERAGE_LABELS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';

interface EntityDrawerProps {
  entityId: string | null;
  onClose: () => void;
}

export function EntityDrawer({ entityId, onClose }: EntityDrawerProps) {
  const { data: entity, isLoading } = useEntity(entityId);
  const { data: summary } = useEntitySummary(entityId);

  return (
    <Sheet open={Boolean(entityId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        {isLoading || !entity ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="w-fit">
                  {GRAPH_ENTITY_TYPE_LABELS[entity.type]}
                </Badge>
                <CreateEntityDialog entity={entity} />
              </div>
              <SheetTitle>{entity.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {entity.contactName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {entity.contactName}
                  </span>
                )}
                {entity.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {entity.city}
                  </span>
                )}
                {entity.website && (
                  <a href={entity.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <Globe className="h-3 w-3" /> Site web
                  </a>
                )}
              </div>
              {(entity.email || entity.phone) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {entity.email && (
                    <a href={`mailto:${entity.email}`} className="flex items-center gap-1 hover:text-primary hover:underline">
                      <Mail className="h-3 w-3" /> {entity.email}
                    </a>
                  )}
                  {entity.phone && (
                    <a href={`tel:${entity.phone}`} className="flex items-center gap-1 hover:text-primary hover:underline">
                      <Phone className="h-3 w-3" /> {entity.phone}
                    </a>
                  )}
                </div>
              )}
              {entity.description && <p className="text-sm text-muted-foreground">{entity.description}</p>}
            </SheetHeader>

            <Separator className="my-4" />

            <div className="flex flex-col gap-4">
              {entity.type === 'PLATEFORME' && (
                <>
                  <div>
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {(entity.metadata as PlatformMetadata | null)?.source ? 'Statistiques baromètre' : 'Veille concurrentielle'}
                    </h3>
                    <PlatformStatsPanel metadata={entity.metadata as PlatformMetadata | null} />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Projets suivis</h3>
                    <CompetitorProjectsPanel entityId={entity.id} />
                  </div>
                </>
              )}

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Opérations liées ({entity.dealLinks.length})
                </h3>
                <div className="flex flex-col gap-1.5">
                  {entity.dealLinks.length === 0 && <p className="text-xs text-muted-foreground">Aucune opération liée</p>}
                  {entity.dealLinks.map((link) => (
                    <Link
                      key={link.id}
                      to={`/deals/${link.deal.id}`}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:border-primary/40"
                    >
                      <span>{link.deal.name}</span>
                      <Badge variant="secondary">{DEAL_ENTITY_ROLE_LABELS[link.role]}</Badge>
                    </Link>
                  ))}
                </div>
              </div>

              {(entity.relationsFrom.length > 0 || entity.relationsTo.length > 0) && (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Relations</h3>
                  <div className="flex flex-col gap-1.5">
                    {entity.relationsFrom.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                        <span>{r.toEntity.name}</span>
                        <Badge variant="outline">{r.label ?? r.type}</Badge>
                      </div>
                    ))}
                    {entity.relationsTo.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                        <span>{r.fromEntity.name}</span>
                        <Badge variant="outline">{r.label ?? r.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Analyse Knowledge Graph</h3>
                    <CreateRelationshipDialog entityId={entity.id} />
                  </div>
                  <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-muted-foreground">
                        Exposition directe : <span className="font-medium text-foreground">{summary.exposureDirect !== null ? formatCurrency(summary.exposureDirect) : '—'}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Exposition consolidée : <span className="font-medium text-foreground">{summary.exposureConsolidated !== null ? formatCurrency(summary.exposureConsolidated) : '—'}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Opérations : <span className="font-medium text-foreground">{summary.operationsActive} active(s) · {summary.operationsRepaid} remboursée(s)</span>
                      </span>
                      <span className="text-muted-foreground">
                        Relations liées : <span className="font-medium text-foreground">{summary.relationsCount}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Garanties partagées : <span className="font-medium text-foreground">{summary.guaranteesSharedCount}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Confiance de l'information :{' '}
                        <span className="font-medium text-foreground">
                          {summary.informationConfidence ? RELATIONSHIP_COVERAGE_LABELS[summary.informationConfidence] : '—'}
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Couverture : {RELATIONSHIP_COVERAGE_LABELS[summary.coverage]} · Dernière vérification :{' '}
                      {summary.lastVerifiedAt ? formatDate(summary.lastVerifiedAt) : 'jamais'}
                    </p>

                    {summary.groupEconomique.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Groupe économique</p>
                        <div className="flex flex-wrap gap-1">
                          {summary.groupEconomique.map((g) => (
                            <Badge key={g.id} variant="outline">
                              {g.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {summary.distressedLinked.length > 0 && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <div>
                          <p className="font-medium">Sociétés liées en difficulté</p>
                          {summary.distressedLinked.map((d) => (
                            <p key={d.id}>
                              {d.name} — {d.reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {entity.articles.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Actualités liées</h3>
                  <div className="flex flex-col gap-1.5">
                    {entity.articles.map(({ article }) => (
                      <div key={article.id} className="rounded-md border border-border px-3 py-2 text-sm">
                        {article.title}
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
