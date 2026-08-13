import { useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpdateGuarantee } from '../hooks/use-guarantees';
import { ApiError } from '@/lib/api';
import { GUARANTEE_TYPE_LABELS, type Guarantee } from '@/types';
import { formatDate } from '@/lib/format';

interface RenewGuaranteeDialogProps {
  dealId: string;
  guarantee: Guarantee;
}

export function RenewGuaranteeDialog({ dealId, guarantee }: RenewGuaranteeDialogProps) {
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const updateGuarantee = useUpdateGuarantee(dealId);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    updateGuarantee.mutate(
      { id: guarantee.id, endDate: newDate },
      { onSuccess: () => { setOpen(false); setNewDate(''); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
          <CalendarClock className="h-3.5 w-3.5" />
          Renouveler
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Renouveler — {GUARANTEE_TYPE_LABELS[guarantee.type]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {guarantee.endDate && (
            <p className="text-xs text-muted-foreground">
              {guarantee.validity === 'NON_VALIDE' ? 'Expirée le' : 'Fin actuelle :'} {formatDate(guarantee.endDate)}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newEndDate">Nouvelle date de fin</Label>
            <Input id="newEndDate" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          </div>
          {updateGuarantee.isError && (
            <p className="text-xs text-destructive">
              {updateGuarantee.error instanceof ApiError ? updateGuarantee.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={updateGuarantee.isPending || !newDate}>
              {updateGuarantee.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer le renouvellement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
