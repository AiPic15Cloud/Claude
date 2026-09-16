import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlatformCoverageTable } from './components/platform-coverage-table';
import { ProjectObservationSheet } from './components/project-observation-sheet';
import { useProjectObservations, useCrowdfundingWatchEvents, useSyncCrowdfundingWatch, useCrowdfundingPlatforms } from './hooks/use-crowdfunding-watch';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  PROJECT_OBSERVATION_STATUS_LABELS,
  MARKET_OBSERVATION_EVENT_LABELS,
  computeAtlasLinkIndicator,
  ATLAS_LINK_INDICATOR_LABELS,
  type ProjectObservationStatus,
  type AtlasLinkIndicator,
} from '@/types';

const ATLAS_LINK_BADGE_STYLE: Record<AtlasLinkIndicator, string> = {
  confirme: 'border-destructive/30 bg-destructive/15 text-destructive',
  potentiel: 'border-warning/30 bg-warning/15 text-warning',
  aucun_lien: 'border-border bg-muted text-muted-foreground',
  non_analyse: 'border-border bg-muted text-muted-foreground/70',
};

const ALL = '__all__';

/**
 * Espace "Veille crowdfunding" (spec §6) — flux des annonces et ouvertures,
 * filtres, couverture des connecteurs, fiche projet avec rapprochement
 * porteur Atlas. Évolution du pilote Market Intelligence Engine
 * (ex-/market-observations) vers un module de production.
 */
export function CrowdfundingWatchPage() {
  const [platformFilter, setPlatformFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<ProjectObservationStatus | typeof ALL>(ALL);
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);

  const { data: platforms } = useCrowdfundingPlatforms();
  const { data: observations, isLoading } = useProjectObservations({
    sourceKey: platformFilter === ALL ? undefined : platformFilter,
    status: statusFilter === ALL ? undefined : statusFilter,
  });
  const { data: events } = useCrowdfundingWatchEvents();
  const sync = useSyncCrowdfundingWatch();

  const visibleEvents = useMemo(() => (events ?? []).filter((e) => !e.isBaseline), [events]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Veille crowdfunding"
        description="Détection des collectes de crowdfunding immobilier à l'annonce et à l'ouverture, avec rapprochement des porteurs déjà suivis dans Atlas."
        actions={
          <Button size="sm" variant="outline" onClick={() => sync.mutate(undefined)} disabled={sync.isPending}>
            <RefreshCw className={cn('h-3.5 w-3.5', sync.isPending && 'animate-spin')} />
            Synchroniser maintenant
          </Button>
        }
      />

      <PlatformCoverageTable />

      <div className="flex flex-wrap gap-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Toutes les plateformes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les plateformes</SelectItem>
            {(platforms ?? []).map((p) => (
              <SelectItem key={p.sourceKey} value={p.sourceKey}>
                {p.platformName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectObservationStatus | typeof ALL)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les statuts</SelectItem>
            {Object.entries(PROJECT_OBSERVATION_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Collectes observées ({observations?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-40 w-full" />}
          {!isLoading && observations?.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Aucune observation pour l'instant — cliquer sur "Synchroniser maintenant" (le résultat arrive après le prochain cycle du
              worker) ou attendre le prochain passage automatique.
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
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Lien Atlas</TableHead>
                    <TableHead>Dernière observation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observations.map((obs) => {
                    const indicator = computeAtlasLinkIndicator(obs.entityLinks, obs.enrichedAt);
                    return (
                      <TableRow key={obs.id} className="cursor-pointer" onClick={() => setSelectedObservationId(obs.id)}>
                        <TableCell className="whitespace-nowrap">{obs.platform?.platformName ?? obs.sourceKey}</TableCell>
                        <TableCell>{obs.projectName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{PROJECT_OBSERVATION_STATUS_LABELS[obs.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{obs.ratePct !== null ? `${obs.ratePct}%` : '—'}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{obs.amountTarget !== null ? formatCurrency(obs.amountTarget) : '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('whitespace-nowrap text-[11px]', ATLAS_LINK_BADGE_STYLE[indicator])}>
                            {ATLAS_LINK_INDICATOR_LABELS[indicator]}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(obs.observedAt), { addSuffix: true, locale: fr })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Annonces et ouvertures récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {visibleEvents.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Aucun événement notifiable pour l'instant.</p>}
          {visibleEvents.length > 0 && (
            <div className="flex flex-col gap-2">
              {visibleEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between border-b border-border py-1.5 text-xs last:border-0">
                  <span>
                    <span className="font-medium">{MARKET_OBSERVATION_EVENT_LABELS[event.eventType]}</span> — {event.projectName}
                    {event.discoveredAlreadyOpen && (
                      <span className="ml-2 text-muted-foreground">(découverte directement ouverte — aucune annonce préalable observée)</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">{formatDate(event.occurredAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Détection et enrichissement tournent en continu sur un service dédié, indépendamment de toute session utilisateur connectée.
        La couverture ci-dessus n'est jamais présentée comme exhaustive : seuls les connecteurs marqués "Opérationnel" ont été
        vérifiés contre une source réelle.
      </p>

      <ProjectObservationSheet observationId={selectedObservationId} onClose={() => setSelectedObservationId(null)} />
    </div>
  );
}
