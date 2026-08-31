import { useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExtendDeadline } from '../hooks/use-loan-lifecycle';
import { ApiError } from '@/lib/api';

interface LoanExtensionDialogProps {
  dealId: string;
  dealName: string;
  currentEndDate: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Prorogation formelle de l'échéance du prêt (spec ATLAS v2, A.3bis) —
 * distincte de ExtendDeadlineDialog (échéance de vote, Deal.dateMax) : ici
 * on prolonge Deal.endDate, l'échéance contractuelle réelle affichée sur la
 * fiche dossier. Collecte les deux dates distinctes de la spec (signature ≠
 * nouvelle échéance) pour que la frise puisse reconstituer un éventuel
 * rattrapage.
 */
export function LoanExtensionDialog({ dealId, dealName, currentEndDate }: LoanExtensionDialogProps) {
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [signatureDate, setSignatureDate] = useState(today());
  const extendDeadline = useExtendDeadline(dealId);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !signatureDate) return;
    extendDeadline.mutate(
      { dateSignature: signatureDate, nouvelleDateEcheance: newDate },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
          <CalendarClock className="h-3.5 w-3.5" />
          Prolonger l'échéance du prêt
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Prolonger l'échéance du prêt — {dealName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {currentEndDate && (
            <p className="text-xs text-muted-foreground">
              Échéance actuelle : {new Date(currentEndDate).toLocaleDateString('fr-FR')}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signatureDate">Date de signature de la prorogation</Label>
            <Input id="signatureDate" type="date" value={signatureDate} onChange={(e) => setSignatureDate(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newEndDate">Nouvelle date d'échéance</Label>
            <Input id="newEndDate" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          </div>
          {extendDeadline.isError && (
            <p className="text-xs text-destructive">
              {extendDeadline.error instanceof ApiError ? extendDeadline.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={extendDeadline.isPending || !newDate || !signatureDate}>
              {extendDeadline.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer la prolongation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
