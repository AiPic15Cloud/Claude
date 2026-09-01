import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRightCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConvertPipelineEntry } from '../hooks/use-pipeline';
import { DEAL_TYPE_LABELS, DEAL_TYPES, type DealType, type PipelineEntry } from '@/types';
import { ApiError } from '@/lib/api';

/** Best-effort guess from the pipeline's free-text typology — always left editable before confirming. */
function guessDealType(typology?: string | null): DealType {
  const t = (typology ?? '').toLowerCase();
  if (t.includes('copropri')) return 'MISE_EN_COPROPRIETE';
  if (t.includes('division') && (t.includes('foncie') || t.includes('fonciè'))) return 'DIVISION_FONCIERE';
  if (t.includes('division')) return 'DIVISION_PARCELLAIRE';
  if (t.includes('aménagement') || t.includes('amenagement')) return 'AMENAGEMENT_FONCIER';
  if (t.includes('marchand') && t.includes('sans')) return 'MARCHAND_DE_BIENS_SANS_TRAVAUX';
  if (t.includes('marchand')) return 'MARCHAND_DE_BIENS_AVEC_TRAVAUX';
  if (t.includes('refinancement') && t.includes('stock')) return 'REFINANCEMENT_STOCK';
  if (t.includes('refinancement') && t.includes('fonds')) return 'REFINANCEMENT_FONDS_PROPRES';
  if (t.includes('refinancement')) return 'REFINANCEMENT_ACTIF';
  return 'PROMOTION_IMMOBILIERE';
}

// register()-bound number inputs pass the raw string through, and an empty
// field coerces to 0 (not undefined) — which then fails .positive()/.int()
// with no visible error, silently blocking submission. Preprocessing blank
// strings to undefined first lets "left empty" actually mean "not set".
const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  type: z.enum(DEAL_TYPES as [DealType, ...DealType[]]),
  amountTarget: z.coerce.number().positive('Montant requis'),
  feesRate: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(100).optional()),
  durationMonths: z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional()),
  city: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ConvertPipelineEntryDialog({ entry }: { entry: PipelineEntry }) {
  const [open, setOpen] = useState(false);
  const convertEntry = useConvertPipelineEntry();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: entry.operator,
      type: guessDealType(entry.typology),
      amountTarget: Number(entry.amount),
      feesRate: entry.feesRate ? Number(entry.feesRate) : undefined,
    },
  });

  const onSubmit = (values: FormValues) => {
    convertEntry.mutate({ id: entry.id, ...values }, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowRightCircle className="h-3.5 w-3.5" />
          Convertir en opération
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir en opération</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Crée une opération dans le Portefeuille à partir de ce dossier validé et lie définitivement les deux — le
          dossier ne pourra plus être converti une seconde fois.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="convert-name">Nom de l'opération</Label>
            <Input id="convert-name" {...register('name')} />
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
              <Label htmlFor="convert-amountTarget">Montant cible (€)</Label>
              <Input id="convert-amountTarget" type="number" min={0} step={1000} {...register('amountTarget')} />
              {errors.amountTarget && <p className="text-xs text-destructive">{errors.amountTarget.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="convert-feesRate">Fees (%)</Label>
              <Input id="convert-feesRate" type="number" min={0} max={100} step={0.1} {...register('feesRate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="convert-durationMonths">Durée (mois)</Label>
              <Input id="convert-durationMonths" type="number" min={1} step={1} {...register('durationMonths')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="convert-city">Ville</Label>
              <Input id="convert-city" placeholder="Lyon" {...register('city')} />
            </div>
          </div>
          {convertEntry.isError && (
            <p className="text-xs text-destructive">
              {convertEntry.error instanceof ApiError ? convertEntry.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={convertEntry.isPending}>
              {convertEntry.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer l'opération
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
