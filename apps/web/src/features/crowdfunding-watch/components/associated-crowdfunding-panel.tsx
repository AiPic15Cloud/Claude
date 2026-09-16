import { useEntityLinksForEntity } from '../hooks/use-crowdfunding-watch';
import { Badge } from '@/components/ui/badge';
import type { EntityLinkMatchType } from '@/types';

const MATCH_TYPE_LABELS: Record<EntityLinkMatchType, string> = {
  DIRECT_ID: 'Correspondance directe (SIREN)',
  DOCUMENTED: 'Lien documenté',
  POTENTIAL: 'Correspondance potentielle',
};

/** Collectes externes associées à ce porteur (spec §6) — nature du lien toujours affichée, jamais un simple compteur. */
export function AssociatedCrowdfundingPanel({ entityId }: { entityId: string }) {
  const { data: links } = useEntityLinksForEntity(entityId);
  const active = (links ?? []).filter((l) => l.status !== 'REJECTED');

  if (active.length === 0) return <p className="text-xs text-muted-foreground">Aucune collecte externe rapprochée pour l'instant.</p>;

  return (
    <div className="flex flex-col gap-1.5">
      {active.map((link) => (
        <div key={link.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
          <div className="flex flex-col">
            <a href={link.observation?.projectUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {link.observation?.projectName ?? 'Collecte'}
            </a>
            <span className="text-xs text-muted-foreground">{MATCH_TYPE_LABELS[link.matchType]}</span>
          </div>
          <Badge variant="outline">{link.status === 'CONFIRMED' ? 'Confirmé' : 'À valider'}</Badge>
        </div>
      ))}
    </div>
  );
}
