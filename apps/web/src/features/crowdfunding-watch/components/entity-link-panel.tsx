import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirmEntityLink, useRejectEntityLink } from '../hooks/use-crowdfunding-watch';
import type { EntityLinkConfidence, EntityLinkMatchType } from '@/types';
import { cn } from '@/lib/utils';

const MATCH_TYPE_LABELS: Record<EntityLinkMatchType, string> = {
  DIRECT_ID: 'Correspondance directe (SIREN)',
  DOCUMENTED: 'Lien documenté',
  POTENTIAL: 'Correspondance potentielle',
};

const CONFIDENCE_LABELS: Record<EntityLinkConfidence, string> = {
  HIGH: 'Haute',
  MEDIUM: 'Moyenne',
  LOW: 'Faible',
};

interface EntityLink {
  id: string;
  matchType: EntityLinkMatchType;
  confidence: EntityLinkConfidence;
  status: 'SUGGESTED' | 'CONFIRMED' | 'REJECTED';
  entity?: { id: string; name: string; type: string };
}

/**
 * Panneau de rapprochement porteur Atlas (spec §4) — chaque ligne affiche le
 * type de correspondance, sa confiance, et conserve la possibilité de
 * confirmer/rejeter manuellement une suggestion. Une adresse commune ou une
 * ressemblance de nom reste un indice, jamais une preuve suffisante : c'est
 * pourquoi seul DIRECT_ID (SIREN) démarre déjà confirmé.
 */
export function EntityLinkPanel({ links, enrichedAt }: { links: EntityLink[]; enrichedAt: string | null }) {
  const confirm = useConfirmEntityLink();
  const reject = useRejectEntityLink();

  if (links.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {enrichedAt ? 'Aucun lien identifié — ceci ne signifie pas une absence de lien, seulement qu\'aucune correspondance n\'a été trouvée lors du dernier rapprochement.' : 'Pas encore analysé.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {links.map((link) => (
        <div key={link.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{link.entity?.name ?? 'Entité inconnue'}</span>
            <span className="text-xs text-muted-foreground">
              {MATCH_TYPE_LABELS[link.matchType]} · Confiance {CONFIDENCE_LABELS[link.confidence]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                link.status === 'CONFIRMED' && 'border-success/30 bg-success/15 text-success',
                link.status === 'REJECTED' && 'border-destructive/30 bg-destructive/15 text-destructive',
                link.status === 'SUGGESTED' && 'border-warning/30 bg-warning/15 text-warning',
              )}
            >
              {link.status === 'CONFIRMED' ? 'Confirmé' : link.status === 'REJECTED' ? 'Rejeté' : 'À valider'}
            </Badge>
            {link.status === 'SUGGESTED' && (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => confirm.mutate(link.id)} aria-label="Confirmer">
                  <Check className="h-3.5 w-3.5 text-success" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reject.mutate({ id: link.id })} aria-label="Rejeter">
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
