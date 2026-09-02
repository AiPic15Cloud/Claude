import { useState } from 'react';
import { Globe, LineChart, ListChecks, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatforms, useSyncPlatforms, useApplyWatchlist } from './hooks/use-platforms';
import { useSourceCoverage } from '@/features/intelligence-marche/hooks/use-market-intelligence';
import { EntityDrawer } from '@/features/knowledge-graph/components/entity-drawer';
import { CreateEntityDialog } from '@/features/knowledge-graph/components/create-entity-dialog';
import {
  CATEGORY_LABELS,
  BUSINESS_MODEL_LABELS,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_VARIANT,
  type PlatformMetadata,
} from './platform-metadata';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { SOURCE_HEALTH_LABELS } from '@/types';

const BAROMETER_HEALTH_VARIANT = { OPERATIONAL: 'success', DEGRADED: 'warning', BROKEN: 'destructive', UNKNOWN: 'outline' } as const;

export function PlatformsPage() {
  const { data: platforms = [], isLoading } = usePlatforms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sync = useSyncPlatforms();
  const watchlist = useApplyWatchlist();
  const { data: coverage } = useSourceCoverage();
  const barometerHealth = coverage?.sources.find((s) => s.key === 'barometer')?.health;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Intelligence Concurrentielle"
        description="Plateformes de crowdfunding immobilier et d'immobilier fractionné suivies par Atlas Capital."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => watchlist.mutate()} disabled={watchlist.isPending}>
              <ListChecks className={cn('h-3.5 w-3.5', watchlist.isPending && 'animate-pulse')} />
              Charger la liste de veille
            </Button>
            <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCw className={cn('h-3.5 w-3.5', sync.isPending && 'animate-spin')} />
              Actualiser (baromètre)
            </Button>
            {barometerHealth && barometerHealth !== 'OPERATIONAL' && (
              <Badge variant={BAROMETER_HEALTH_VARIANT[barometerHealth]}>Baromètre : {SOURCE_HEALTH_LABELS[barometerHealth]}</Badge>
            )}
            <CreateEntityDialog />
          </>
        }
      />

      {watchlist.data && (
        <p className="text-xs text-muted-foreground">
          {watchlist.data.applied} plateforme(s) mise(s) à jour depuis la liste de veille concurrentielle recherchée.
        </p>
      )}

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
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {meta.category && <Badge variant="outline">{CATEGORY_LABELS[meta.category] ?? meta.category}</Badge>}
                      {meta.isTerminated && <Badge variant="destructive">Fermée</Badge>}
                      {meta.externalScore != null && (
                        <Badge
                          variant={meta.externalScore >= 60 ? 'success' : meta.externalScore >= 35 ? 'warning' : 'destructive'}
                          title="Score externe — baromètre-crowdfunding.com, jamais un score Atlas natif"
                        >
                          Externe {Math.round(meta.externalScore)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium">{platform.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {meta.businessModel && (
                      <Badge variant="secondary">{BUSINESS_MODEL_LABELS[meta.businessModel] ?? meta.businessModel}</Badge>
                    )}
                    {meta.verificationStatus && (
                      <Badge variant={VERIFICATION_STATUS_VARIANT[meta.verificationStatus] ?? 'outline'}>
                        {VERIFICATION_STATUS_LABELS[meta.verificationStatus] ?? meta.verificationStatus}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {(meta.country ?? platform.city) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {meta.country ?? platform.city}
                      </span>
                    )}
                    {platform.website && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Site
                      </span>
                    )}
                  </div>

                  {meta.totalFunded != null && (
                    <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-xs">
                      <span className="text-muted-foreground">Total financé</span>
                      <span className="font-medium tabular-nums">{formatCurrency(meta.totalFunded)}</span>
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
