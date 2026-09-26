import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import type { DecisionRow } from '@/types';

const TIER_LABEL: Record<DecisionRow['tier'], string> = { HIGH: 'Critique', WATCH: 'Vigilance' };
const TIER_VARIANT: Record<DecisionRow['tier'], 'destructive' | 'warning'> = { HIGH: 'destructive', WATCH: 'warning' };
const COLLAPSED_ROW_LIMIT = 5;

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
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = decisions.length > COLLAPSED_ROW_LIMIT;
  const visibleDecisions = expanded ? decisions : decisions.slice(0, COLLAPSED_ROW_LIMIT);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <div>
          <CardTitle className="text-base">Centre de décision</CardTitle>
          <p className="text-xs text-muted-foreground">Dossiers nécessitant une action, classés par risque.</p>
        </div>
        <span className="text-xs text-muted-foreground">{decisions.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {decisions.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun dossier ne nécessite d'attention immédiate.</p>
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
              {visibleDecisions.map((d) => (
                <TableRow key={d.dealId}>
                  <TableCell className="whitespace-nowrap py-1.5">
                    <Badge variant={TIER_VARIANT[d.tier]}>
                      {TIER_LABEL[d.tier]} · {d.score}/100
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-1.5">
                    <Link to={`/deals/${d.dealId}`} className="font-medium hover:text-primary hover:underline">
                      {d.dealName}
                    </Link>
                    <span className="ml-1.5 text-xs text-muted-foreground">{d.dealReference}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate py-1.5 text-sm font-medium" title={d.signalExplanation || undefined}>
                    {d.signalLabel}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-1.5 text-right font-mono tabular-nums">{formatCurrency(d.exposition)}</TableCell>
                  <TableCell className="whitespace-nowrap py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                    {formatDeadline(d.daysToMax)}
                  </TableCell>
                  <TableCell className="py-1.5 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/deals/${d.dealId}`}>Ouvrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Afficher les {decisions.length - COLLAPSED_ROW_LIMIT} autres
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
