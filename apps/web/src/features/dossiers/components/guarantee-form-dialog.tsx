import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateGuarantee, useUpdateGuarantee } from '../hooks/use-guarantees';
import { ApiError } from '@/lib/api';
import { EXPIRABLE_GUARANTEE_TYPES, GUARANTEE_TYPE_LABELS, type Guarantee, type GuaranteeType } from '@/types';

const GUARANTEE_TYPES: GuaranteeType[] = ['HYPOTHEQUE', 'FIDUCIE', 'CAUTION', 'GAGE', 'NANTISSEMENT', 'PRIVILEGE', 'AUTRE'];

const schema = z.object({
  type: z.enum(['HYPOTHEQUE', 'FIDUCIE', 'CAUTION', 'GAGE', 'NANTISSEMENT', 'PRIVILEGE', 'AUTRE']),
  description: z.string().min(2, 'Description requise'),
  amount: z.coerce.number().positive('Montant requis'),
  rank: z.coerce.number().int().positive().optional(),
  endDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

interface GuaranteeFormDialogProps {
  dealId: string;
  // Omit for "add", pass the existing row for "edit" — same form either way.
  guarantee?: Guarantee;
}

export function GuaranteeFormDialog({ dealId, guarantee }: GuaranteeFormDialogProps) {
  const isEdit = Boolean(guarantee);
  const [open, setOpen] = useState(false);
  const createGuarantee = useCreateGuarantee(dealId);
  const updateGuarantee = useUpdateGuarantee(dealId);
  const mutation = isEdit ? updateGuarantee : createGuarantee;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: guarantee
      ? {
          type: guarantee.type,
          description: guarantee.description,
          amount: Number(guarantee.amount),
          rank: guarantee.rank,
          endDate: toDateInput(guarantee.endDate),
        }
      : { type: 'HYPOTHEQUE', rank: 1 },
  });

  const selectedType = watch('type');
  const showEndDate = EXPIRABLE_GUARANTEE_TYPES.includes(selectedType);

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, endDate: showEndDate ? values.endDate : undefined };
    if (isEdit && guarantee) {
      updateGuarantee.mutate({ id: guarantee.id, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      createGuarantee.mutate(payload, { onSuccess: () => { setOpen(false); reset(); } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la garantie' : 'Nouvelle garantie'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GUARANTEE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {GUARANTEE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Montant (€)</Label>
              <Input id="amount" type="number" min={0} step={1000} {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rank">Rang</Label>
              <Input id="rank" type="number" min={1} step={1} {...register('rank')} />
            </div>
          </div>
          {showEndDate && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              <p className="text-xs text-muted-foreground">
                Pilote le statut Valide/Non valide et l’alerte de renouvellement à 6 mois.
              </p>
            </div>
          )}
          {mutation.isError && (
            <p className="text-xs text-destructive">
              {mutation.error instanceof ApiError ? mutation.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
