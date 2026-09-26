import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from './button';

/**
 * Bouton de suppression à double confirmation — extrait du pattern déjà
 * correct de documents-panel.tsx pour le réutiliser partout où une
 * suppression n'avait qu'un seul clic, sans confirmation ni libellé
 * accessible (garanties, remboursements, notes, entités liées, postes de
 * coût, lots de vente, barème de scoring...). Un clic affiche
 * Annuler/Confirmer à la place de l'icône ; seul le second clic déclenche
 * `onConfirm`.
 */
export function ConfirmDeleteButton({
  onConfirm,
  pending = false,
  label = 'Supprimer',
  size = 'sm',
}: {
  onConfirm: () => void;
  pending?: boolean;
  label?: string;
  size?: 'sm' | 'default' | 'icon';
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Annuler
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={onConfirm} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirmer'}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant="ghost"
      className="text-destructive hover:text-destructive"
      aria-label={label}
      title={label}
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
