import { ShieldCheck, Shield, Trash2, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FreshnessBadge } from '@/components/ui/freshness-badge';
import { useGuarantees, useDeleteGuarantee, useMarkGuaranteeVerified } from '../hooks/use-guarantees';
import { GuaranteeFormDialog } from './guarantee-form-dialog';
import { RenewGuaranteeDialog } from './renew-guarantee-dialog';
import { formatCurrency, formatDate } from '@/lib/format';
import { GUARANTEE_STATUS_LABELS, GUARANTEE_TYPE_LABELS, type GuaranteeStatus } from '@/types';

const STATUS_VARIANT: Record<GuaranteeStatus, 'success' | 'warning' | 'destructive'> = {
  ACTIVE: 'success',
  RELEASED: 'warning',
  DEFAULTED: 'destructive',
};

export function GuaranteesPanel({ dealId }: { dealId: string }) {
  const { data: guarantees = [], isLoading } = useGuarantees(dealId);
  const deleteGuarantee = useDeleteGuarantee(dealId);
  const markVerified = useMarkGuaranteeVerified(dealId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Garanties</CardTitle>
        <GuaranteeFormDialog dealId={dealId} />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!isLoading && guarantees.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Aucune garantie enregistrée</p>
        )}
        {guarantees.map((g) => {
          const needsRenewal = g.expiringSoon || g.validity === 'NON_VALIDE';
          return (
            <div key={g.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">{GUARANTEE_TYPE_LABELS[g.type]}</span>
                    <Badge variant={STATUS_VARIANT[g.status]}>{GUARANTEE_STATUS_LABELS[g.status]}</Badge>
                    {g.endDate && (
                      <Badge variant={g.validity === 'VALIDE' ? 'success' : 'destructive'}>
                        {g.validity === 'VALIDE' ? 'Valide' : 'Non valide'}
                      </Badge>
                    )}
                    {g.expiringSoon && (
                      <span title={`Renouvellement à prévoir — J-${g.daysToExpiry}`}>
                        <TriangleAlert className="h-3.5 w-3.5 text-warning" />
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">Rang {g.rank}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                  {g.endDate && <p className="text-xs text-muted-foreground">Fin : {formatDate(g.endDate)}</p>}
                  {g.status === 'ACTIVE' && <FreshnessBadge checkedAt={g.verifiedAt} label="Vérifiée" />}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(g.amount)}</span>
                {g.status === 'ACTIVE' && (
                  <Button variant="outline" size="sm" onClick={() => markVerified.mutate(g.id)} disabled={markVerified.isPending}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Marquer comme vérifiée
                  </Button>
                )}
                {needsRenewal && <RenewGuaranteeDialog dealId={dealId} guarantee={g} />}
                <GuaranteeFormDialog dealId={dealId} guarantee={g} />
                <Button variant="ghost" size="icon" onClick={() => deleteGuarantee.mutate(g.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
