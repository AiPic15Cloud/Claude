import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Pencil, Plus, Wallet, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRepayments, useCreateRepayment, useUpdateRepayment, useDeleteRepayment } from '../hooks/use-repayments';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Repayment } from '@/types';

const schema = z.object({
  amount: z.coerce.number().positive('Montant requis'),
  date: z.string().min(1, 'Date requise'),
  projected: z.boolean().optional(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function RepaymentsPanel({ dealId }: { dealId: string }) {
  const { data: repayments = [], isLoading } = useRepayments(dealId);
  const createRepayment = useCreateRepayment(dealId);
  const updateRepayment = useUpdateRepayment(dealId);
  const deleteRepayment = useDeleteRepayment(dealId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Repayment | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { projected: false } });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({ amount: Number(editing.amount), date: editing.date.slice(0, 10), projected: editing.projected, note: editing.note ?? '' });
    } else {
      reset({ amount: undefined, date: '', projected: false, note: '' });
    }
  }, [open, editing, reset]);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (r: Repayment) => { setEditing(r); setOpen(true); };

  const onSubmit = (values: FormValues) => {
    if (editing) {
      updateRepayment.mutate({ id: editing.id, ...values }, { onSuccess: () => setOpen(false) });
    } else {
      createRepayment.mutate(values, { onSuccess: () => setOpen(false) });
    }
  };

  const isPending = editing ? updateRepayment.isPending : createRepayment.isPending;

  const totalActual = repayments.filter((r) => !r.projected).reduce((sum, r) => sum + Number(r.amount), 0);
  const totalProjected = repayments.filter((r) => r.projected).reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Remboursements</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(totalActual)} réalisés
            {totalProjected > 0 && ` · ${formatCurrency(totalProjected)} projetés`}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Modifier le remboursement' : 'Nouveau remboursement'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Montant (€)</Label>
                  <Input id="amount" type="number" min={0} step={0.01} {...register('amount')} />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" {...register('date')} />
                  {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
              </div>
              <Controller
                control={control}
                name="projected"
                render={({ field }) => (
                  <div className="flex items-center gap-2.5">
                    <Switch checked={field.value} onCheckedChange={field.onChange} id="projected" />
                    <Label htmlFor="projected" className="cursor-pointer font-normal">
                      Projection future (pas encore réalisée)
                    </Label>
                  </div>
                )}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Note (optionnel)</Label>
                <Input id="note" {...register('note')} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!isLoading && repayments.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Aucun remboursement enregistré</p>
        )}
        {repayments.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-md border border-border p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatDate(r.date)}</span>
                {r.projected && <Badge variant="warning">Projeté</Badge>}
              </div>
              {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(r.amount)}</span>
            <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => deleteRepayment.mutate(r.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
