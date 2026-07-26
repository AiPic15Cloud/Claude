import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateDeal } from '@/features/portfolio/hooks/use-deals';
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  DEAL_STATUS_LABELS,
  DEAL_TYPE_LABELS,
  type DealDetail,
  type DealStage,
  type DealStatus,
  type DealType,
} from '@/types';
import { ApiError } from '@/lib/api';

const DEAL_TYPES: DealType[] = ['CROWDFUNDING', 'FRACTIONNE', 'PROMOTION', 'MARCHAND_DE_BIENS', 'AUTRE'];
const DEAL_STATUSES: DealStatus[] = ['ACTIVE', 'ON_HOLD', 'CLOSED', 'ARCHIVED'];

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  type: z.enum(['CROWDFUNDING', 'FRACTIONNE', 'PROMOTION', 'MARCHAND_DE_BIENS', 'AUTRE']),
  stage: z.enum(DEAL_STAGES as [DealStage, ...DealStage[]]),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'CLOSED', 'ARCHIVED']),
  amountTarget: z.coerce.number().positive('Montant requis'),
  amountRaised: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100).optional().or(z.literal(undefined)),
  durationMonths: z.coerce.number().int().positive().optional().or(z.literal(undefined)),
  city: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dateMin: z.string().optional(),
  dateCible: z.string().optional(),
  dateMax: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function EditDealDialog({ deal }: { deal: DealDetail }) {
  const [open, setOpen] = useState(false);
  const updateDeal = useUpdateDeal(deal.id);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: deal.name,
      type: deal.type,
      stage: deal.stage,
      status: deal.status,
      amountTarget: Number(deal.amountTarget),
      amountRaised: Number(deal.amountRaised),
      interestRate: deal.interestRate ? Number(deal.interestRate) : undefined,
      durationMonths: deal.durationMonths ?? undefined,
      city: deal.city ?? '',
      startDate: toDateInput(deal.startDate),
      endDate: toDateInput(deal.endDate),
      dateMin: toDateInput(deal.dateMin),
      dateCible: toDateInput(deal.dateCible),
      dateMax: toDateInput(deal.dateMax),
      description: deal.description ?? '',
    },
  });

  const onSubmit = (values: FormValues) => {
    updateDeal.mutate(values, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'opération</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom de l'opération</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
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
              <Label>Étape</Label>
              <Controller
                control={control}
                name="stage"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DEAL_STAGE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Statut</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DEAL_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountTarget">Montant cible (€)</Label>
              <Input id="amountTarget" type="number" min={0} step={1000} {...register('amountTarget')} />
              {errors.amountTarget && <p className="text-xs text-destructive">{errors.amountTarget.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountRaised">Montant collecté (€)</Label>
              <Input id="amountRaised" type="number" min={0} step={1000} {...register('amountRaised')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interestRate">Taux (%)</Label>
              <Input id="interestRate" type="number" min={0} max={100} step={0.1} {...register('interestRate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="durationMonths">Durée (mois)</Label>
              <Input id="durationMonths" type="number" min={1} step={1} {...register('durationMonths')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" {...register('city')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Date de signature</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">Échéance</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
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

          {updateDeal.isError && (
            <p className="text-xs text-destructive">
              {updateDeal.error instanceof ApiError ? updateDeal.error.message : 'Une erreur est survenue'}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={updateDeal.isPending}>
              {updateDeal.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
