import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Pencil, Plus, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useInterestPayments, useInterestPaymentStatus, useCreateInterestPayment, useUpdateInterestPayment, useDeleteInterestPayment } from '../hooks/use-interest-payments';
import { formatCurrency, formatDate } from '@/lib/format';
import { parseLocaleNumber } from '@/lib/locale-number';
import { INTEREST_PAYMENT_LEVEL_LABELS, type InterestPayment } from '@/types';

function parseAmount(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  return parseLocaleNumber(raw);
}

const schema = z.object({
  paidDate: z.string().min(1, 'Date requise'),
  amount: z
    .string()
    .optional()
    .refine((v) => !v || Number.isFinite(parseAmount(v)), 'Montant invalide'),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const STATUS_VARIANT = { RAS: 'success', DUE_SOON: 'warning', OVERDUE: 'destructive' } as const;

/** Journal des paiements d'intérêts constatés (Deal.repaymentMode = MENSUEL) — n'apparaît que pour un dossier en mode mensuel. */
export function InterestPaymentsPanel({ dealId }: { dealId: string }) {
  const { data: payments = [], isLoading } = useInterestPayments(dealId);
  const { data: status } = useInterestPaymentStatus(dealId);
  const createPayment = useCreateInterestPayment(dealId);
  const updatePayment = useUpdateInterestPayment(dealId);
  const deletePayment = useDeleteInterestPayment(dealId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InterestPayment | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({ paidDate: editing.paidDate.slice(0, 10), amount: editing.amount ?? '', note: editing.note ?? '' });
    } else {
      reset({ paidDate: '', amount: '', note: '' });
    }
  }, [open, editing, reset]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (p: InterestPayment) => {
    setEditing(p);
    setOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const payload = { paidDate: values.paidDate, amount: parseAmount(values.amount ?? ''), note: values.note };
    if (editing) {
      updatePayment.mutate({ id: editing.id, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      createPayment.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  };

  const isPending = editing ? updatePayment.isPending : createPayment.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle>Paiements d'intérêts</CardTitle>
          {status && (
            <span title={`Échéance du cycle en cours : ${formatDate(status.currentDueDate)}`}>
              <Badge variant={STATUS_VARIANT[status.level]}>
                {INTEREST_PAYMENT_LEVEL_LABELS[status.level]}
                {status.daysOverdue > 0 ? ` (${status.daysOverdue} j)` : ''}
              </Badge>
            </span>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le paiement d'intérêts" : "Nouveau paiement d'intérêts"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="paidDate">Date de paiement</Label>
                  <Input id="paidDate" type="date" {...register('paidDate')} />
                  {errors.paidDate && <p className="text-xs text-destructive">{errors.paidDate.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Montant (€, optionnel)</Label>
                  <DecimalInput id="amount" {...register('amount')} />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
              </div>
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
        {!isLoading && payments.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Aucun paiement d'intérêts enregistré</p>}
        {payments.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{formatDate(p.paidDate)}</span>
                {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
              {p.amount && <span className="text-sm font-semibold tabular-nums">{formatCurrency(p.amount)}</span>}
              <Button variant="ghost" size="icon" aria-label="Modifier" title="Modifier" onClick={() => openEdit(p)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <ConfirmDeleteButton onConfirm={() => deletePayment.mutate(p.id)} pending={deletePayment.isPending} label="Supprimer le paiement" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
