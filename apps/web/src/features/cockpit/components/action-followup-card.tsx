import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ActionQueueCard } from '@/types';

function formatDueAt(dueAt: string | null): string {
  if (!dueAt) return '—';
  return new Date(dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function ActionColumn({ title, cards, emptyLabel }: { title: string; cards: ActionQueueCard[]; emptyLabel: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>
      {cards.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{emptyLabel}</p>}
      {cards.map((card) => (
        <div key={card.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{card.operation}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.motif}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.ownerLabel ?? 'Non assigné'} · échéance {formatDueAt(card.dueAt)}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to={card.deepLink}>{card.ctaLabel}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

/**
 * Colonnes "À faire" / "En attente externe" (spec Cockpit/Fractionné P1
 * §4.1.3) — une action à faire par nous n'est jamais mélangée à une
 * réponse attendue d'un tiers. Chaque ligne porte un CTA spécifique (jamais
 * "Ouvrir" seul, spec §4.2) qui mène directement à l'endroit où agir.
 */
export function ActionFollowUpCard({ aFaire, enAttente }: { aFaire: ActionQueueCard[]; enAttente: ActionQueueCard[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">À faire / En attente</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ActionColumn title="À faire" cards={aFaire} emptyLabel="Rien à faire de notre côté." />
        <ActionColumn title="En attente externe" cards={enAttente} emptyLabel="Aucune réponse en attente." />
      </CardContent>
    </Card>
  );
}
