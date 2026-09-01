import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceCoverageCard } from '@/features/intelligence-marche/components/source-coverage-card';
import { useProjectObservations, useMarketObservationEvents, useSyncMarketObservations } from './hooks/use-market-observations';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PROJECT_OBSERVATION_STATUS_LABELS, MARKET_OBSERVATION_EVENT_LABELS } from '@/types';

/**
 * Pilote Market Intelligence Engine (spec ATLAS v2, C.1-C.3) — 5 sources
 * pilotes, observations de projet automatisées. SourceCoverageCard est
 * réutilisé tel quel : il affiche déjà toute la table du Source Registry
 * sans filtre, les 5 nouvelles clés y apparaissent d'elles-mêmes.
 */
export function MarketObservationsPage() {
  const { data: observations, isLoading } = useProjectObservations();
  const { data: events } = useMarketObservationEvents();
  const sync = useSyncMarketObservations();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Observations marché"
        description="Pilote Market Intelligence — observations de projet automatisées sur 5 sources de crowdfunding immobilier."
        actions={
          <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
            <RefreshCw className={cn('h-3.5 w-3.5', sync.isPending && 'animate-spin')} />
            Synchroniser maintenant
          </Button>
        }
      />

      <SourceCoverageCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Observations courantes ({observations?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-40 w-full" />}
          {!isLoading && observations?.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Aucune observation pour l'instant — cliquer sur "Synchroniser maintenant" ou attendre le prochain passage automatique (toutes les 6h).
            </p>
          )}
          {!isLoading && observations && observations.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plateforme</TableHead>
                    <TableHead>Projet</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Segment ATLAS</TableHead>
                    <TableHead>Dernière observation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observations.map((obs) => (
                    <TableRow key={obs.id}>
                      <TableCell className="whitespace-nowrap">{obs.platform}</TableCell>
                      <TableCell>
                        <a href={obs.projectUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          {obs.projectName}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{PROJECT_OBSERVATION_STATUS_LABELS[obs.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{obs.ratePct !== null ? `${obs.ratePct}%` : '—'}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{obs.durationMonths !== null ? `${obs.durationMonths} mois` : '—'}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{obs.amountTarget !== null ? formatCurrency(obs.amountTarget) : '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {obs.atlasSegment ? `${obs.atlasSegment} (${obs.mappingConfidence})` : obs.sourceCategory ? `${obs.sourceCategory} (non mappé)` : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(obs.observedAt), { addSuffix: true, locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Événements récents</CardTitle>
        </CardHeader>
        <CardContent>
          {(!events || events.length === 0) && <p className="py-4 text-center text-xs text-muted-foreground">Aucun événement enregistré.</p>}
          {events && events.length > 0 && (
            <div className="flex flex-col gap-2">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between border-b border-border py-1.5 text-xs last:border-0">
                  <span>
                    <span className="font-medium">{MARKET_OBSERVATION_EVENT_LABELS[event.eventType]}</span> — {event.projectName}
                  </span>
                  <span className="text-muted-foreground">{formatDate(event.occurredAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Sélecteurs d'extraction non vérifiés contre le HTML réel des sources — pages inaccessibles depuis l'environnement de
        développement. Chaque source indisponible reste visible avec sa raison dans la couverture ci-dessus, jamais une donnée
        inventée.
      </p>
    </div>
  );
}
