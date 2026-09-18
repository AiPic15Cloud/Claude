import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePrequalExposure } from '../hooks/use-prequalification';

/**
 * Exposition et historique du porteur (spec §12) — les "autres opérations"
 * sont retrouvées via Deal.porteurSiren (même mécanisme que l'auto-link
 * SIREN existant, aucune nouvelle table de liaison), les financements sur
 * d'autres plateformes via les rapprochements CONFIRMED de la Veille
 * crowdfunding. `expectedInterest` est une estimation (capital restant dû ×
 * taux), jamais un calendrier d'échéances réel.
 */
export function ExposureTab({ caseId }: { caseId: string }) {
  const { data, isLoading } = usePrequalExposure(caseId);

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exposition consolidée</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Metric label="Encours actuel" value={formatCurrency(data.totalOutstandingCapital)} />
          <Metric label="Intérêts attendus (estimation)" value={formatCurrency(data.totalExpectedInterest)} />
          <Metric label="Nouvelle exposition après financement" value={data.newExposureAfterFinancing != null ? formatCurrency(data.newExposureAfterFinancing) : '—'} />
          <Metric label="Concentration de ce dossier" value={data.concentrationPct != null ? `${data.concentrationPct.toFixed(1)} %` : '—'} />
        </CardContent>
        {data.lateCount > 0 && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {data.lateCount} opération(s) en retard sur les échéances du même porteur.
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Autres opérations du porteur/société ({data.deals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.deals.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucune autre opération identifiée (par SIREN) pour ce porteur.</p>}
          {data.deals.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead>Encours</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.deals.map((deal) => (
                  <TableRow key={deal.dealId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{deal.dealName}</span>
                        <span className="text-xs text-muted-foreground">{deal.dealReference}</span>
                      </div>
                    </TableCell>
                    <TableCell>{deal.stage}</TableCell>
                    <TableCell>{formatCurrency(deal.outstandingCapital)}</TableCell>
                    <TableCell>{deal.dateMax ? formatDate(deal.dateMax) : '—'}</TableCell>
                    <TableCell>
                      {deal.isLate ? (
                        <Badge variant="destructive">En retard</Badge>
                      ) : (
                        <Badge variant="outline">{deal.recoveryStatus}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Financements identifiés sur d'autres plateformes ({data.externalFinancings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.externalFinancings.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun rapprochement confirmé via la Veille crowdfunding pour ce porteur.</p>
          )}
          {data.externalFinancings.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plateforme</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Montant recherché</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.externalFinancings.map((f, index) => (
                  <TableRow key={index}>
                    <TableCell>{f.platformName}</TableCell>
                    <TableCell>{f.projectName}</TableCell>
                    <TableCell>{f.amountTarget != null ? formatCurrency(f.amountTarget) : '—'}</TableCell>
                    <TableCell>{f.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
