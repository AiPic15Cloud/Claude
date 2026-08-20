import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Pencil, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCheckpoints, useCreateCheckpoint, useUpdateCheckpoint } from '../hooks/use-checkpoints';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import type { ProjectCheckpoint } from '@/types';

// Optional numeric fields must stay unset (not coerce to 0) when left
// blank — same fix already applied elsewhere for register()-bound number
// inputs, since an empty string otherwise silently becomes a confirmed 0.
const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);

const schema = z.object({
  travauxBudgetInitial: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),
  travauxDepensesADate: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),
  travauxTermines: z.boolean().optional(),
  commercialisationLancee: z.boolean().optional(),
  pourcentageVendu: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(100).optional()),
  prixVenteInitialPrevu: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),
  prixVenteReelADate: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),
  atterrissagePrevu: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function DeltaBadge({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const isBad = invert ? value < 0 : value > 0;
  const isGood = invert ? value > 0 : value < 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular-nums',
        isBad && 'text-destructive',
        isGood && 'text-success',
      )}
    >
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : value < 0 ? <TrendingDown className="h-3 w-3" /> : null}
      {value > 0 ? '+' : ''}
      {formatCurrency(value)}
    </span>
  );
}

export function CheckpointsPanel({ dealId }: { dealId: string }) {
  const { data: checkpoints, isLoading } = useCheckpoints(dealId);
  const create = useCreateCheckpoint(dealId);
  const update = useUpdateCheckpoint(dealId);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const startCreate = () => {
    setEditingId(null);
    reset({});
    setOpen(true);
  };

  const startEdit = (checkpoint: ProjectCheckpoint) => {
    setEditingId(checkpoint.id);
    reset({
      travauxBudgetInitial: checkpoint.travauxBudgetInitial ?? undefined,
      travauxDepensesADate: checkpoint.travauxDepensesADate ?? undefined,
      travauxTermines: checkpoint.travauxTermines,
      commercialisationLancee: checkpoint.commercialisationLancee,
      pourcentageVendu: checkpoint.pourcentageVendu ?? undefined,
      prixVenteInitialPrevu: checkpoint.prixVenteInitialPrevu ?? undefined,
      prixVenteReelADate: checkpoint.prixVenteReelADate ?? undefined,
      atterrissagePrevu: checkpoint.atterrissagePrevu ?? undefined,
      notes: checkpoint.notes ?? undefined,
    });
    setOpen(true);
  };

  const saving = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    if (editingId) {
      update.mutate(
        { checkpointId: editingId, ...values },
        {
          onSuccess: () => {
            setOpen(false);
            setEditingId(null);
            reset();
          },
        },
      );
      return;
    }
    create.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Points à durée cible</CardTitle>
          <CardDescription>État des lieux chantier / commercialisation, comparé au prévisionnel initial.</CardDescription>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setEditingId(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={startCreate}>
              <Plus className="h-3.5 w-3.5" /> Nouveau point
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Modifier le point à durée cible' : 'Nouveau point à durée cible'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="travauxBudgetInitial">Budget travaux initial (€)</Label>
                  <Input
                    id="travauxBudgetInitial"
                    type="number"
                    placeholder="Pré-rempli depuis le modèle financier si vide"
                    {...register('travauxBudgetInitial')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="travauxDepensesADate">Dépenses travaux à date (€)</Label>
                  <Input id="travauxDepensesADate" type="number" {...register('travauxDepensesADate')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prixVenteInitialPrevu">Prix de vente prévu (€)</Label>
                  <Input
                    id="prixVenteInitialPrevu"
                    type="number"
                    placeholder="Pré-rempli depuis le modèle financier si vide"
                    {...register('prixVenteInitialPrevu')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prixVenteReelADate">Prix de vente réel à date (€)</Label>
                  <Input id="prixVenteReelADate" type="number" {...register('prixVenteReelADate')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pourcentageVendu">Lots vendus (%)</Label>
                  <Input id="pourcentageVendu" type="number" min={0} max={100} {...register('pourcentageVendu')} />
                  {errors.pourcentageVendu && <p className="text-xs text-destructive">{errors.pourcentageVendu.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="atterrissagePrevu">Atterrissage prévu</Label>
                  <Input id="atterrissagePrevu" placeholder="ex: marge ~8%, fin travaux T2 2027" {...register('atterrissagePrevu')} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="travauxTermines" className="cursor-pointer">Travaux terminés</Label>
                <Controller
                  control={control}
                  name="travauxTermines"
                  render={({ field }) => <Switch id="travauxTermines" checked={field.value ?? false} onCheckedChange={field.onChange} />}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="commercialisationLancee" className="cursor-pointer">Commercialisation lancée</Label>
                <Controller
                  control={control}
                  name="commercialisationLancee"
                  render={({ field }) => (
                    <Switch id="commercialisationLancee" checked={field.value ?? false} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} {...register('notes')} />
              </div>

              {(create.isError || update.isError) && (
                <p className="text-xs text-destructive">
                  {(create.error ?? update.error) instanceof ApiError ? (create.error ?? update.error)?.message : 'Une erreur est survenue'}
                </p>
              )}

              <DialogFooter>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Enregistrer les modifications' : 'Enregistrer le point'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-32 w-full" />}
        {!isLoading && checkpoints?.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Aucun point enregistré pour ce dossier.</p>
        )}
        <div className="flex flex-col gap-3">
          {checkpoints?.map((c) => (
            <div key={c.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {c.recordedBy.firstName} {c.recordedBy.lastName} ·{' '}
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: fr })}
                </p>
                <div className="flex items-center gap-2 text-[11px]">
                  {c.travauxTermines && <span className="rounded bg-success/10 px-1.5 py-0.5 text-success">Travaux finis</span>}
                  {c.commercialisationLancee && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">Commercialisé {c.pourcentageVendu ?? 0}%</span>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(c)}>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Delta travaux</p>
                  <DeltaBadge value={c.deltaTravaux} invert={false} />
                </div>
                <div>
                  <p className="text-muted-foreground">Delta prix de vente</p>
                  <DeltaBadge value={c.deltaPrix} invert />
                </div>
                <div>
                  <p className="text-muted-foreground">Marge à date</p>
                  <DeltaBadge value={c.margeADate} invert />
                </div>
              </div>
              {c.atterrissagePrevu && <p className="mt-2 text-xs text-muted-foreground">Atterrissage : {c.atterrissagePrevu}</p>}
              {c.notes && <p className="mt-1 text-xs">{c.notes}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
