import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus, Shield, Trash2, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGuarantees, useCreateGuarantee, useDeleteGuarantee } from '../hooks/use-guarantees';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  EXPIRABLE_GUARANTEE_TYPES,
  GUARANTEE_STATUS_LABELS,
  GUARANTEE_TYPE_LABELS,
  type GuaranteeStatus,
  type GuaranteeType,
} from '@/types';

const GUARANTEE_TYPES: GuaranteeType[] = ['HYPOTHEQUE', 'FIDUCIE', 'CAUTION', 'GAGE', 'NANTISSEMENT', 'PRIVILEGE', 'AUTRE'];

const schema = z.object({
  type: z.enum(['HYPOTHEQUE', 'FIDUCIE', 'CAUTION', 'GAGE', 'NANTISSEMENT', 'PRIVILEGE', 'AUTRE']),
  description: z.string().min(2, 'Description requise'),
  amount: z.coerce.number().positive('Montant requis'),
  rank: z.coerce.number().int().positive().optional(),
  endDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const STATUS_VARIANT: Record<GuaranteeStatus, 'success' | 'warning' | 'destructive'> = {
  ACTIVE: 'success',
  RELEASED: 'warning',
  DEFAULTED: 'destructive',
};

export function GuaranteesPanel({ dealId }: { dealId: string }) {
  const { data: guarantees = [], isLoading } = useGuarantees(dealId);
  const createGuarantee = useCreateGuarantee(dealId);
  const deleteGuarantee = useDeleteGuarantee(dealId);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'HYPOTHEQUE', rank: 1 } });

  const selectedType = watch('type');
  const showEndDate = EXPIRABLE_GUARANTEE_TYPES.includes(selectedType);

  const onSubmit = (values: FormValues) => {
    createGuarantee.mutate(
      { ...values, endDate: showEndDate ? values.endDate : undefined },
      { onSuccess: () => { setOpen(false); reset(); } },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Garanties</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle garantie</DialogTitle>
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
              <DialogFooter>
                <Button type="submit" disabled={createGuarantee.isPending}>
                  {createGuarantee.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!isLoading && guarantees.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Aucune garantie enregistrée</p>
        )}
        {guarantees.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-md border border-border p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{GUARANTEE_TYPE_LABELS[g.type]}</span>
                <Badge variant={STATUS_VARIANT[g.status]}>{GUARANTEE_STATUS_LABELS[g.status]}</Badge>
                {g.endDate && (
                  <Badge variant={g.validity === 'VALIDE' ? 'success' : 'destructive'}>
                    {g.validity === 'VALIDE' ? 'Valide' : 'Non valide'}
                  </Badge>
                )}
                {g.expiringSoon && (
                  <span title={`Renouvellement à prévoir — J-${g.daysToExpiry}`}>
                    <TriangleAlert className="h-3.5 w-3.5 text-warning" />
                  </span>
                )}
                <span className="text-xs text-muted-foreground">Rang {g.rank}</span>
              </div>
              <p className="text-xs text-muted-foreground">{g.description}</p>
              {g.endDate && <p className="text-xs text-muted-foreground">Fin : {formatDate(g.endDate)}</p>}
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(g.amount)}</span>
            <Button variant="ghost" size="icon" onClick={() => deleteGuarantee.mutate(g.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
