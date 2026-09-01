import { useState } from 'react';
import { Loader2, ShieldAlert, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMarkSubstantiveDefect } from '../hooks/use-guarantees';
import { useCanValidate } from '@/features/auth/use-auth';
import { ApiError } from '@/lib/api';
import { GUARANTEE_TYPE_LABELS, type Guarantee } from '@/types';

interface SubstantiveDefectDialogProps {
  dealId: string;
  guarantee: Guarantee;
}

/**
 * Vice de fond (spec ATLAS v2, A.9) — distinct d'une simple expiration de
 * date : mauvais rang enregistré, signature manquante, vice de forme...
 * jamais déductible d'une donnée existante, un analyste doit le constater
 * explicitement avec une note (traçabilité). Lever le constat ne demande
 * pas de note — c'est un simple retour à l'état par défaut.
 */
export function SubstantiveDefectDialog({ dealId, guarantee }: SubstantiveDefectDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(guarantee.substantiveDefectNote ?? '');
  const markSubstantiveDefect = useMarkSubstantiveDefect(dealId);
  const canValidate = useCanValidate();

  if (guarantee.substantiveDefect) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          markSubstantiveDefect.mutate({ id: guarantee.id, flagged: false });
        }}
        disabled={markSubstantiveDefect.isPending || !canValidate}
        title={canValidate ? undefined : 'Réservé aux analystes et administrateurs'}
      >
        {markSubstantiveDefect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
        Lever le défaut de fond
      </Button>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    markSubstantiveDefect.mutate(
      { id: guarantee.id, flagged: true, note: note.trim() },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => e.stopPropagation()}
          disabled={!canValidate}
          title={canValidate ? undefined : 'Réservé aux analystes et administrateurs'}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Signaler un défaut de fond
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Défaut de fond — {GUARANTEE_TYPE_LABELS[guarantee.type]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Un vice juridique (mauvais rang enregistré, signature manquante, vice de forme...) rend la sûreté non
            valide indépendamment de sa date d'échéance. Décrivez le défaut constaté.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defectNote">Note (obligatoire)</Label>
            <Textarea id="defectNote" value={note} onChange={(e) => setNote(e.target.value)} required rows={3} />
          </div>
          {markSubstantiveDefect.isError && (
            <p className="text-xs text-destructive">
              {markSubstantiveDefect.error instanceof ApiError ? markSubstantiveDefect.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={markSubstantiveDefect.isPending || !note.trim()}>
              {markSubstantiveDefect.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Signaler le défaut de fond
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
