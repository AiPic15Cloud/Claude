import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { ActionQueueCard } from '@/types';

const COLLAPSED_ROW_LIMIT = 5;

function formatDueAt(dueAt: string | null): string {
  if (!dueAt) return '—';
  return new Date(dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface DecisionCenterCardProps {
  cards: ActionQueueCard[];
}

/**
 * Premier écran du "Real Estate Intelligence OS" : plutôt que de dire "voici
 * votre portefeuille", dit "voici ce dont vous devez vous occuper
 * aujourd'hui". Consomme `actionQueue.aDecider` — la même file unifiée que
 * le Cockpit mobile (Deal en risque, blocage Préqual, ActionItem) : avant
 * cette passe, ce bloc ne montrait que les décisions Deal (`data.decisions`,
 * legacy) et un covenant rompu ou un blocage Préqual n'apparaissait jamais
 * ici, seulement sur mobile — jamais deux vérités différentes de "ce qui
 * bloque" entre les deux écrans.
 */
export function DecisionCenterCard({ cards }: DecisionCenterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = cards.length > COLLAPSED_ROW_LIMIT;
  const visibleCards = expanded ? cards : cards.slice(0, COLLAPSED_ROW_LIMIT);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <div>
          <CardTitle className="text-base">Centre de décision</CardTitle>
          <p className="text-xs text-muted-foreground">Dossiers et blocages nécessitant une décision, tous producteurs confondus.</p>
        </div>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {cards.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun dossier ne nécessite d'attention immédiate.</p>
        )}
        {cards.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Priorité</TableHead>
                <TableHead>Opération</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead className="text-right">Échéance</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="whitespace-nowrap py-1.5">
                    <Badge variant={card.blocking ? 'destructive' : 'warning'}>{card.blocking ? 'Bloquant' : 'À arbitrer'}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-1.5">
                    <Link to={card.deepLink} className="font-medium hover:text-primary hover:underline">
                      {card.operation}
                    </Link>
                    {card.reference && <span className="ml-1.5 text-xs text-muted-foreground">{card.reference}</span>}
                  </TableCell>
                  <TableCell className="max-w-xs truncate py-1.5 text-sm font-medium" title={card.motif}>
                    {card.motif}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-1.5 text-sm text-muted-foreground">{card.ownerLabel ?? 'Non assigné'}</TableCell>
                  <TableCell className="whitespace-nowrap py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                    {formatDueAt(card.dueAt)}
                  </TableCell>
                  <TableCell className="py-1.5 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={card.deepLink}>{card.ctaLabel}</Link>
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
                Afficher les {cards.length - COLLAPSED_ROW_LIMIT} autres
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
