import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePipelineEntry } from '../hooks/use-pipeline';
import { COMMITTEE_STATUS_LABELS, type CommitteeStatus } from '@/types';
import { ApiError } from '@/lib/api';

const COMMITTEE_STATUSES: CommitteeStatus[] = ['PAS_DE_COMITE', 'VALIDE', 'CONDITIONS_SUSPENSIVES', 'REFUSE'];

const schema = z.object({
  date: z.string().min(1, 'Date requise'),
  operator: z.string().min(1, 'Opérateur requis'),
  typology: z.string().optional(),
  source: z.string().optional(),
  amount: z.coerce.number().positive('Montant requis'),
  margin: z.coerce.number().optional().or(z.literal(undefined)),
  committee: z.enum(['PAS_DE_COMITE', 'VALIDE', 'CONDITIONS_SUSPENSIVES', 'REFUSE']),
  decision: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreatePipelineEntryDialog() {
  const [open, setOpen] = useState(false);
  const createEntry = useCreatePipelineEntry();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { committee: 'PAS_DE_COMITE' } });

  const onSubmit = (values: FormValues) => {
    createEntry.mutate(values, { onSuccess: () => { setOpen(false); reset(); } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nouveau dossier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau dossier reçu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="operator">Opérateur</Label>
              <Input id="operator" {...register('operator')} />
              {errors.operator && <p className="text-xs text-destructive">{errors.operator.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="typology">Typologie</Label>
              <Input id="typology" placeholder="Marchand de biens avec travaux" {...register('typology')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Source (apporteur)</Label>
              <Input id="source" {...register('source')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Montant (€)</Label>
              <Input id="amount" type="number" min={0} step={1000} {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="margin">Marge (%)</Label>
              <Input id="margin" type="number" step={0.1} {...register('margin')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Statut comité</Label>
            <Controller
              control={control}
              name="committee"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMITTEE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {COMMITTEE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="decision">Décision / commentaire</Label>
            <Input id="decision" {...register('decision')} />
          </div>
          {createEntry.isError && (
            <p className="text-xs text-destructive">
              {createEntry.error instanceof ApiError ? createEntry.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
