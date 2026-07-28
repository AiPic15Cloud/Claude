import { Link } from 'react-router-dom';
import { Globe, MapPin } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEntity } from '../hooks/use-graph';
import { CompetitorProjectsPanel } from '@/features/intelligence-concurrentielle/components/competitor-projects-panel';
import { DEAL_ENTITY_ROLE_LABELS, GRAPH_ENTITY_TYPE_LABELS } from '@/types';

interface EntityDrawerProps {
  entityId: string | null;
  onClose: () => void;
}

export function EntityDrawer({ entityId, onClose }: EntityDrawerProps) {
  const { data: entity, isLoading } = useEntity(entityId);

  return (
    <Sheet open={Boolean(entityId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        {isLoading || !entity ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <SheetHeader>
              <Badge variant="outline" className="w-fit">
                {GRAPH_ENTITY_TYPE_LABELS[entity.type]}
              </Badge>
              <SheetTitle>{entity.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
              {entity.description && <p className="text-sm text-muted-foreground">{entity.description}</p>}
            </SheetHeader>

            <Separator className="my-4" />

            <div className="flex flex-col gap-4">
              {entity.type === 'PLATEFORME' && (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Projets suivis</h3>
                  <CompetitorProjectsPanel entityId={entity.id} />
                </div>
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
