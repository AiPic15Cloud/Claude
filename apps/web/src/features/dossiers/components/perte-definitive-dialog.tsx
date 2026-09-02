import { useState } from 'react';
import { Loader2, TrendingDown, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMarkPerteDefinitive } from '@/features/portfolio/hooks/use-deals';
import { useCanValidate } from '@/features/auth/use-auth';
import { ApiError } from '@/lib/api';
import type { Deal } from '@/types';

/**
 * Déclencheur "Perte" du dashboard portefeuille agrégé (spec ATLAS v2,
 * module MARKO F.2) — délibérément une décision manuelle de l'analyste
 * ("liquidation judiciaire prononcée + délai de recouvrement épuisé" reste
 * un jugement, pas une règle automatisable sans risque de faux positif/
 * négatif). Même pattern que SubstantiveDefectDialog (A.9) : note
 * obligatoire pour acter, aucune note requise pour lever.
 */
export function PerteDefinitiveDialog({ deal }: { deal: Deal }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(deal.perteDefinitiveNote ?? '');
  const markPerteDefinitive = useMarkPerteDefinitive(deal.id);
  const canValidate = useCanValidate();

  if (deal.perteDefinitiveActee) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => markPerteDefinitive.mutate({ flagged: false })}
        disabled={markPerteDefinitive.isPending || !canValidate}
        title={canValidate ? undefined : 'Réservé aux analystes et administrateurs'}
      >
        {markPerteDefinitive.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
        Lever la perte définitive
      </Button>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    markPerteDefinitive.mutate({ flagged: true, note: note.trim() }, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!canValidate} title={canValidate ? undefined : 'Réservé aux analystes et administrateurs'}>
          <TrendingDown className="h-3.5 w-3.5" />
          Marquer en perte définitive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acter une perte définitive — {deal.reference}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Distinct d'une procédure en cours (recoveryStatus) : ceci retire le dossier du compteur "Actif" du
            dashboard portefeuille et l'ajoute au compteur "Perte", de façon irréversible tant que ce n'est pas levé
            manuellement. Décrivez la justification (ex. liquidation judiciaire prononcée, recouvrement jugé épuisé).
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perteNote">Note (obligatoire)</Label>
            <Textarea id="perteNote" value={note} onChange={(e) => setNote(e.target.value)} required rows={3} />
          </div>
          {markPerteDefinitive.isError && (
            <p className="text-xs text-destructive">
              {markPerteDefinitive.error instanceof ApiError ? markPerteDefinitive.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={markPerteDefinitive.isPending || !note.trim()}>
              {markPerteDefinitive.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Acter la perte définitive
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
