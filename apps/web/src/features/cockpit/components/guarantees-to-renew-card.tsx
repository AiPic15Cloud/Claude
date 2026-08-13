import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GUARANTEE_TYPE_LABELS, type GuaranteeToRenew } from '@/types';
import { cn } from '@/lib/utils';

interface GuaranteesToRenewCardProps {
  guarantees: GuaranteeToRenew[];
}

export function GuaranteesToRenewCard({ guarantees }: GuaranteesToRenewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Garantie à renouveler</CardTitle>
        <span className="text-xs text-muted-foreground">{guarantees.length}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {guarantees.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Aucune garantie à renouveler. RAS.</p>
        )}
        {guarantees.map((g) => {
          const expired = g.validity === 'NON_VALIDE';
          return (
            <Link
              key={g.id}
              to={`/deals/${g.dealId}`}
              className="flex items-center gap-2.5 rounded-md px-1.5 py-2 hover:bg-accent"
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  expired ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
                )}
              >
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.dealName}</p>
                <p className="text-xs text-muted-foreground">{GUARANTEE_TYPE_LABELS[g.type]}</p>
              </div>
              <Badge variant={expired ? 'destructive' : 'warning'} className="shrink-0">
                {expired ? 'Expirée' : `J-${g.daysToExpiry}`}
              </Badge>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
