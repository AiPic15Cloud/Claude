import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdatePipelineEntry } from '../hooks/use-pipeline';
import { COMMITTEE_STATUS_LABELS, type CommitteeStatus, type PipelineEntry } from '@/types';
import { ApiError } from '@/lib/api';

const COMMITTEE_STATUSES: CommitteeStatus[] = ['PAS_DE_COMITE', 'VALIDE', 'CONDITIONS_SUSPENSIVES', 'REFUSE'];

// register()-bound number inputs pass the raw string through, and an empty
// field coerces to 0 rather than staying unset — a blank "Fees (%)" should
// mean "not entered", not "confirmed at 0%".
const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);

const schema = z.object({
  date: z.string().min(1, 'Date requise'),
  operator: z.string().min(1, 'Opérateur requis'),
  typology: z.string().optional(),
  source: z.string().optional(),
  amount: z.coerce.number().positive('Montant requis'),
  margin: z.preprocess(blankToUndefined, z.coerce.number().optional()),
  feesRate: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(100).optional()),
  committee: z.enum(['PAS_DE_COMITE', 'VALIDE', 'CONDITIONS_SUSPENSIVES', 'REFUSE']),
  decision: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function EditPipelineEntryDialog({ entry }: { entry: PipelineEntry }) {
  const [open, setOpen] = useState(false);
  const updateEntry = useUpdatePipelineEntry();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: entry.date.slice(0, 10),
      operator: entry.operator,
      typology: entry.typology ?? '',
      source: entry.source ?? '',
      amount: Number(entry.amount),
      margin: entry.margin ? Number(entry.margin) : undefined,
      feesRate: entry.feesRate ? Number(entry.feesRate) : undefined,
      committee: entry.committee,
      decision: entry.decision ?? '',
    },
  });

  const onSubmit = (values: FormValues) => {
    updateEntry.mutate({ id: entry.id, ...values }, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Modifier le dossier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le dossier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-operator">Opérateur</Label>
              <Input id="edit-operator" {...register('operator')} />
              {errors.operator && <p className="text-xs text-destructive">{errors.operator.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-typology">Typologie</Label>
              <Input id="edit-typology" placeholder="Marchand de biens avec travaux" {...register('typology')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-source">Source (apporteur)</Label>
              <Input id="edit-source" {...register('source')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-amount">Montant (€)</Label>
              <Input id="edit-amount" type="number" min={0} step={1000} {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-margin">Marge (%)</Label>
              <Input id="edit-margin" type="number" step={0.1} {...register('margin')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-feesRate">Fees ATLAS (%)</Label>
              <Input id="edit-feesRate" type="number" min={0} max={100} step={0.1} {...register('feesRate')} />
              {errors.feesRate && <p className="text-xs text-destructive">{errors.feesRate.message}</p>}
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
            <Label htmlFor="edit-decision">Décision / commentaire</Label>
            <Input id="edit-decision" {...register('decision')} />
          </div>
          {updateEntry.isError && (
            <p className="text-xs text-destructive">
              {updateEntry.error instanceof ApiError ? updateEntry.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={updateEntry.isPending}>
              {updateEntry.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
