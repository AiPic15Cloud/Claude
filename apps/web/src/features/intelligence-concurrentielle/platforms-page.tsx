import { useState } from 'react';
import { Globe, LineChart, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatforms, useSyncPlatforms } from './hooks/use-platforms';
import { EntityDrawer } from '@/features/knowledge-graph/components/entity-drawer';
import { CreateEntityDialog } from '@/features/knowledge-graph/components/create-entity-dialog';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PlatformMetadata {
  category?: string | null;
  source?: string;
  fetchedAt?: string;
  isTerminated?: boolean | null;
  totalFunded?: number | null;
  projectCountFinanced?: number | null;
  capitalReimbursed?: number | null;
  projectCountReimbursed?: number | null;
  riskAmount?: number | null;
  riskProjects?: number | null;
  capitalInDefault?: number | null;
  lastReportDate?: string | null;
  averageLoanDuration?: number | null;
  atlasScore?: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  'real-estate': 'Immobilier',
  'renewable-energy': 'Énergies renouvelables',
  crowdlending: 'Crowdlending',
  other: 'Autre',
};

export function PlatformsPage() {
  const { data: platforms = [], isLoading } = usePlatforms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sync = useSyncPlatforms();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Intelligence Concurrentielle</h1>
          <p className="text-sm text-muted-foreground">
            Plateformes de crowdfunding immobilier et d'immobilier fractionné suivies par ATLAS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
            <RefreshCw className={cn('h-3.5 w-3.5', sync.isPending && 'animate-spin')} />
            Actualiser (baromètre)
          </Button>
          <CreateEntityDialog />
        </div>
      </div>

      {sync.data && (
        <p className="text-xs text-muted-foreground">
          {sync.data.degraded
            ? `Source indisponible pour le moment (${sync.data.source}) — aucune donnée mise à jour.`
            : `${sync.data.synced} plateforme(s) synchronisée(s) depuis ${sync.data.source}.`}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => {
            const meta = (platform.metadata ?? {}) as PlatformMetadata;
            return (
              <Card
                key={platform.id}
                className="cursor-pointer transition-colors hover:border-primary/40"
                onClick={() => setSelectedId(platform.id)}
              >
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <LineChart className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {meta.category && <Badge variant="outline">{CATEGORY_LABELS[meta.category] ?? meta.category}</Badge>}
                      {meta.isTerminated && <Badge variant="destructive">Fermée</Badge>}
                      {meta.atlasScore != null && (
                        <Badge variant={meta.atlasScore >= 60 ? 'success' : meta.atlasScore >= 35 ? 'warning' : 'destructive'}>
                          Score {Math.round(meta.atlasScore)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium">{platform.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {platform.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {platform.city}
                      </span>
                    )}
                    {platform.website && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Site
                      </span>
                    )}
                    {meta.lastReportDate && <span>Rapport du {formatDate(meta.lastReportDate)}</span>}
                  </div>

                  {meta.source && (
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-2 text-xs">
                      {meta.totalFunded != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total financé</span>
                          <span className="font-medium tabular-nums">{formatCurrency(meta.totalFunded)}</span>
                        </div>
                      )}
                      {meta.projectCountFinanced != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Projets financés</span>
                          <span className="font-medium tabular-nums">{meta.projectCountFinanced}</span>
                        </div>
                      )}
                      {meta.capitalReimbursed != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capital remboursé</span>
                          <span className="font-medium tabular-nums">{formatCurrency(meta.capitalReimbursed)}</span>
                        </div>
                      )}
                      {meta.projectCountReimbursed != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Projets remboursés</span>
                          <span className="font-medium tabular-nums">{meta.projectCountReimbursed}</span>
                        </div>
                      )}
                      {meta.riskAmount != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capital à risque</span>
                          <span className={cn('font-medium tabular-nums', meta.riskAmount > 0 && 'text-warning')}>
                            {formatCurrency(meta.riskAmount)}
                          </span>
                        </div>
                      )}
                      {meta.capitalInDefault != null && meta.capitalInDefault > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pertes définitives</span>
                          <span className="font-medium tabular-nums text-destructive">{formatCurrency(meta.capitalInDefault)}</span>
                        </div>
                      )}
                      {meta.averageLoanDuration != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Durée moy. prêts</span>
                          <span className="font-medium tabular-nums">{meta.averageLoanDuration} mois</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EntityDrawer entityId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
