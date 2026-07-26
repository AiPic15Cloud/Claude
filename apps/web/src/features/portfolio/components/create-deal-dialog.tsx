import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateDeal } from '../hooks/use-deals';
import { DEAL_TYPE_LABELS, type DealType } from '@/types';
import { ApiError } from '@/lib/api';

const DEAL_TYPES: DealType[] = ['CROWDFUNDING', 'FRACTIONNE', 'PROMOTION', 'MARCHAND_DE_BIENS', 'AUTRE'];

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  type: z.enum(['CROWDFUNDING', 'FRACTIONNE', 'PROMOTION', 'MARCHAND_DE_BIENS', 'AUTRE']),
  amountTarget: z.coerce.number().positive('Montant requis'),
  interestRate: z.coerce.number().min(0).max(100).optional().or(z.literal(undefined)),
  feesRate: z.coerce.number().min(0).max(100).optional().or(z.literal(undefined)),
  durationMonths: z.coerce.number().int().positive().optional().or(z.literal(undefined)),
  city: z.string().optional(),
  dateMin: z.string().optional(),
  dateCible: z.string().optional(),
  dateMax: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateDealDialog() {
  const [open, setOpen] = useState(false);
  const createDeal = useCreateDeal();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'CROWDFUNDING' },
  });

  const onSubmit = (values: FormValues) => {
    createDeal.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nouvelle opération
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle opération</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom de l'opération</Label>
            <Input id="name" placeholder="Résidence Les Terrasses" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                      {DEAL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {DEAL_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountTarget">Montant cible (€)</Label>
              <Input id="amountTarget" type="number" min={0} step={1000} {...register('amountTarget')} />
              {errors.amountTarget && <p className="text-xs text-destructive">{errors.amountTarget.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interestRate">Taux (%)</Label>
              <Input id="interestRate" type="number" min={0} max={100} step={0.1} {...register('interestRate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feesRate">Fees (%)</Label>
              <Input id="feesRate" type="number" min={0} max={100} step={0.1} {...register('feesRate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="durationMonths">Durée (mois)</Label>
              <Input id="durationMonths" type="number" min={1} step={1} {...register('durationMonths')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" placeholder="Lyon" {...register('city')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
            <p className="text-xs font-medium text-foreground">Échéance de vote (suivi J-90 / J-60 / J-30 / J-15)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateMin">Date min</Label>
                <Input id="dateMin" type="date" {...register('dateMin')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateCible">Date cible</Label>
                <Input id="dateCible" type="date" {...register('dateCible')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateMax">Date max</Label>
                <Input id="dateMax" type="date" {...register('dateMax')} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          {createDeal.isError && (
            <p className="text-xs text-destructive">
              {createDeal.error instanceof ApiError ? createDeal.error.message : 'Une erreur est survenue'}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={createDeal.isPending}>
              {createDeal.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer l'opération
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
