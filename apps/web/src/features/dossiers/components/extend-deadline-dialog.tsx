import { useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpdateDeal } from '@/features/portfolio/hooks/use-deals';
import { ApiError } from '@/lib/api';

interface ExtendDeadlineDialogProps {
  dealId: string;
  dealName: string;
  currentDateMax: string | null;
  size?: 'sm' | 'default';
}

export function ExtendDeadlineDialog({ dealId, dealName, currentDateMax, size = 'sm' }: ExtendDeadlineDialogProps) {
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const updateDeal = useUpdateDeal(dealId);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    updateDeal.mutate({ dateMax: newDate }, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant="outline" onClick={(e) => e.stopPropagation()}>
          <CalendarClock className="h-3.5 w-3.5" />
          Prolonger
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Prolonger l'échéance — {dealName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {currentDateMax && (
            <p className="text-xs text-muted-foreground">
              Échéance actuelle : {new Date(currentDateMax).toLocaleDateString('fr-FR')}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newDateMax">Nouvelle date max</Label>
            <Input id="newDateMax" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          </div>
          {updateDeal.isError && (
            <p className="text-xs text-destructive">
              {updateDeal.error instanceof ApiError ? updateDeal.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={updateDeal.isPending || !newDate}>
              {updateDeal.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer la prolongation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
