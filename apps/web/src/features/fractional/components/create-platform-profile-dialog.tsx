import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreatePlatformProfile } from '../hooks/use-fractional';
import { ApiError } from '@/lib/api';
import { parseLocaleNumber } from '@/lib/locale-number';

// Normalise une saisie texte ("6,5") en valeur exploitable par z.coerce.number()
// avant coercition — sinon "6,5" (locale française) donne NaN plutôt que 6.5,
// voir lib/locale-number.ts.
const normalizeDecimal = (v: unknown) => (typeof v === 'string' ? parseLocaleNumber(v) : v);

const schema = z.object({
  platformName: z.string().min(2, 'Requis'),
  effectiveFrom: z.string().min(1, 'Requis'),
  minNetInvestorYieldPct: z.preprocess(normalizeDecimal, z.coerce.number().min(0)),
  acquisitionFeePct: z.preprocess(normalizeDecimal, z.coerce.number().min(0).optional()),
  annualManagementFeePct: z.preprocess(normalizeDecimal, z.coerce.number().min(0).optional()),
  incomeShareInvestorPct: z.preprocess(normalizeDecimal, z.coerce.number().min(0).max(100)),
  capitalGainShareInvestorPct: z.preprocess(normalizeDecimal, z.coerce.number().min(0).max(100)),
});
type FormValues = z.infer<typeof schema>;

/** Profil plateforme (spec V3 §16.1) — versionné et daté, jamais codé en dur dans le moteur. */
export function CreatePlatformProfileDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreatePlatformProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { platformName: '', effectiveFrom: new Date().toISOString().slice(0, 10), minNetInvestorYieldPct: 6.5, incomeShareInvestorPct: 90, capitalGainShareInvestorPct: 80 },
  });

  const onSubmit = (values: FormValues) => {
    create.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
          Nouveau profil plateforme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau profil plateforme</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="platformName">Plateforme</Label>
            <Input id="platformName" placeholder="ex: Tantiem" {...register('platformName')} />
            {errors.platformName && <p className="text-xs text-destructive">{errors.platformName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="effectiveFrom">Effectif depuis</Label>
              <Input id="effectiveFrom" type="date" {...register('effectiveFrom')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minNetInvestorYieldPct">Hurdle net investisseur (%)</Label>
              <DecimalInput id="minNetInvestorYieldPct" {...register('minNetInvestorYieldPct')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acquisitionFeePct">Frais d'acquisition (%)</Label>
              <DecimalInput id="acquisitionFeePct" {...register('acquisitionFeePct')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="annualManagementFeePct">Frais de gestion annuels (%)</Label>
              <DecimalInput id="annualManagementFeePct" {...register('annualManagementFeePct')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incomeShareInvestorPct">Part investisseur — revenus (%)</Label>
              <DecimalInput id="incomeShareInvestorPct" {...register('incomeShareInvestorPct')} />
              {errors.incomeShareInvestorPct && <p className="text-xs text-destructive">{errors.incomeShareInvestorPct.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capitalGainShareInvestorPct">Part investisseur — plus-value (%)</Label>
              <DecimalInput id="capitalGainShareInvestorPct" {...register('capitalGainShareInvestorPct')} />
              {errors.capitalGainShareInvestorPct && <p className="text-xs text-destructive">{errors.capitalGainShareInvestorPct.message}</p>}
            </div>
          </div>
          {create.isError && (
            <p className="text-xs text-destructive">{create.error instanceof ApiError ? create.error.message : 'Une erreur est survenue'}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
