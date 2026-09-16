import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCrowdfundingPlatforms } from '../hooks/use-crowdfunding-watch';
import { CROWDFUNDING_CONNECTOR_STATUS_LABELS, type CrowdfundingConnectorStatus } from '@/types';
import { cn } from '@/lib/utils';

const CONNECTOR_STATUS_VARIANT: Record<CrowdfundingConnectorStatus, string> = {
  OPERATIONAL: 'bg-success/15 text-success border-success/30',
  PARTIAL: 'bg-warning/15 text-warning border-warning/30',
  BLOCKED: 'bg-destructive/15 text-destructive border-destructive/30',
  TO_BUILD: 'bg-muted text-muted-foreground border-border',
};

function formatFrequency(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 120) return `${Math.round(seconds)} s`;
  if (seconds < 7200) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} h`;
}

/**
 * Couverture des plateformes de crowdfunding (spec §1) — jamais un agrégat
 * qui masquerait un connecteur non opérationnel : une ligne par plateforme,
 * statut déclaré par un humain (connectorStatus), jamais déduit
 * automatiquement d'un cycle de synchronisation réussi.
 */
export function PlatformCoverageTable() {
  const { data: platforms, isLoading } = useCrowdfundingPlatforms();
  if (isLoading || !platforms) return null;

  const operational = platforms.filter((p) => p.connectorStatus === 'OPERATIONAL').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Couverture des plateformes — {operational}/{platforms.length} opérationnelle(s)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plateforme</TableHead>
                <TableHead>Connecteur</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Fréquence cible</TableHead>
                <TableHead>Fréquence effective</TableHead>
                <TableHead>Dernière vérification</TableHead>
                <TableHead>Limites de couverture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map((platform) => (
                <TableRow key={platform.sourceKey}>
                  <TableCell className="whitespace-nowrap font-medium">{platform.platformName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('whitespace-nowrap', CONNECTOR_STATUS_VARIANT[platform.connectorStatus])}>
                      {CROWDFUNDING_CONNECTOR_STATUS_LABELS[platform.connectorStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{platform.accessMethod}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatFrequency(platform.targetCheckFrequencySeconds)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatFrequency(platform.effectiveCheckFrequencySeconds)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {platform.registryEntry?.lastCheckedAt
                      ? formatDistanceToNow(new Date(platform.registryEntry.lastCheckedAt), { addSuffix: true, locale: fr })
                      : 'jamais'}
                  </TableCell>
                  <TableCell className="max-w-[280px] text-xs text-muted-foreground">{platform.coverageNotes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Un connecteur "Partiel" a du code de collecte écrit mais jamais confirmé contre une page réelle — jamais présenté comme
          opérationnel avant vérification effective en production (spec §1).
        </p>
      </CardContent>
    </Card>
  );
}
