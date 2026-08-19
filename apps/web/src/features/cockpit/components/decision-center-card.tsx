import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import type { DecisionRow } from '@/types';

const TIER_LABEL: Record<DecisionRow['tier'], string> = { HIGH: 'Critique', WATCH: 'Vigilance' };
const TIER_VARIANT: Record<DecisionRow['tier'], 'destructive' | 'warning'> = { HIGH: 'destructive', WATCH: 'warning' };

function formatDeadline(daysToMax: number | null): string {
  if (daysToMax === null) return '—';
  if (daysToMax <= 0) return `J+${Math.abs(daysToMax)}`;
  return `J-${daysToMax}`;
}

interface DecisionCenterCardProps {
  decisions: DecisionRow[];
}

/**
 * Premier écran du "Real Estate Intelligence OS" : plutôt que de dire "voici
 * votre portefeuille", dit "voici ce dont vous devez vous occuper aujourd'hui".
 * Purement une agrégation du Risk Engine (zones WATCH/HIGH triées par score) —
 * aucune nouvelle règle métier, le facteur dominant du score sert de "Signal".
 */
export function DecisionCenterCard({ decisions }: DecisionCenterCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Centre de décision</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Dossiers nécessitant une action, classés par risque.</p>
        </div>
        <span className="text-xs text-muted-foreground">{decisions.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {decisions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun dossier ne nécessite d'attention immédiate.</p>
        )}
        {decisions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Priorité</TableHead>
                <TableHead>Opération</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead className="text-right">Exposition</TableHead>
                <TableHead className="text-right">Échéance</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.map((d) => (
                <TableRow key={d.dealId}>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={TIER_VARIANT[d.tier]}>
                      {TIER_LABEL[d.tier]} · {d.score}/100
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Link to={`/deals/${d.dealId}`} className="font-medium hover:text-primary hover:underline">
                      {d.dealName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{d.dealReference}</p>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm font-medium">{d.signalLabel}</p>
                    <p className="text-xs text-muted-foreground">{d.signalExplanation}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{formatCurrency(d.exposition)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-muted-foreground">
                    {formatDeadline(d.daysToMax)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/deals/${d.dealId}`}>Ouvrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
