import { Building2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCheckCompany } from '../hooks/use-check-company';
import { formatDate } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  actif: 'Statut administratif actif',
  procedure_collective: 'Procédure collective en cours',
  fermee: 'Société fermée/radiée',
};

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  actif: 'success',
  procedure_collective: 'destructive',
  fermee: 'destructive',
};

/**
 * Surveillance quotidienne (8h) du SIREN du porteur — ce bouton déclenche une
 * vérification immédiate plutôt que d'attendre le prochain passage du job.
 */
export function CompanyMonitoringCard({
  dealId,
  siren,
  societe,
  status,
  checkedAt,
}: {
  dealId: string;
  siren: string;
  societe?: string | null;
  status?: string | null;
  checkedAt?: string | null;
}) {
  const checkCompany = useCheckCompany(dealId);
  const displayStatus = checkCompany.data?.status ?? status ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Surveillance de la société de projet</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3 rounded-md border border-border p-3">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{societe || 'Société de projet'}</p>
            <p className="text-xs text-muted-foreground">SIREN {siren}</p>
            <div className="mt-1.5 flex items-center gap-2">
              {displayStatus ? (
                <Badge variant={STATUS_VARIANT[displayStatus] ?? 'outline'}>{STATUS_LABEL[displayStatus] ?? displayStatus}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Pas encore vérifié</span>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => checkCompany.mutate()} disabled={checkCompany.isPending}>
            {checkCompany.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Vérifier maintenant
          </Button>
        </div>

        {checkCompany.isError && (
          <p className="text-xs text-destructive">
            Échec de la vérification — {checkCompany.error instanceof Error ? checkCompany.error.message : 'réessayez plus tard.'}
          </p>
        )}
        {checkCompany.isSuccess && !checkCompany.data.status && (
          <p className="text-xs text-muted-foreground">
            Source indisponible pour le moment (SIRENE/BODACC) — nouvelle tentative au prochain passage quotidien.
          </p>
        )}
        {checkCompany.isSuccess && checkCompany.data.changed && (
          <p className="text-xs text-muted-foreground">Changement de statut détecté — une alerte a été créée.</p>
        )}

        <p className="text-[11px] text-muted-foreground">
          Sources : SIRENE (statut administratif) et BODACC (procédures collectives), via API Recherche d'Entreprises et le
          bulletin officiel. Vérification automatique quotidienne à 8h, alerte créée uniquement en cas de changement de statut.
        </p>
        <p className="text-[11px] text-muted-foreground">
          {checkedAt ? `Dernière vérification : ${formatDate(checkedAt)}` : 'Jamais vérifié — à vérifier'}
        </p>
      </CardContent>
    </Card>
  );
}
