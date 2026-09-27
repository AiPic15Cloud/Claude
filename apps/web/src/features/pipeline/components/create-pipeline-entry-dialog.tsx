import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePipelineEntry } from '../hooks/use-pipeline';
import { usePrequalificationCases } from '@/features/prequalification/hooks/use-prequalification';
import { COMMITTEE_STATUS_LABELS, PREQUALIFICATION_STATUS_LABELS, type CommitteeStatus } from '@/types';
import { ApiError } from '@/lib/api';
import { parseLocaleNumber } from '@/lib/locale-number';

const COMMITTEE_STATUSES: CommitteeStatus[] = ['PAS_DE_COMITE', 'VALIDE', 'CONDITIONS_SUSPENSIVES', 'REFUSE'];

// Normalise "1 234,56" en valeur exploitable par z.coerce.number() — sinon un
// <input type="number"> rejette silencieusement le "," sous une locale française
// et un champ texte transmettrait "1234,56" tel quel, coercé en NaN.
const normalizeDecimal = (v: unknown) => (typeof v === 'string' ? parseLocaleNumber(v) : v);

// register()-bound number inputs pass the raw string through, and an empty
// field coerces to 0 rather than staying unset — a blank "Fees (%)" should
// mean "not entered", not "confirmed at 0%". Also normalises the locale comma
// before coercion, same reason as normalizeDecimal above.
const blankToUndefined = (v: unknown) => {
  if (v === '') return undefined;
  return typeof v === 'string' ? parseLocaleNumber(v) : v;
};

const schema = z.object({
  date: z.string().min(1, 'Date requise'),
  operator: z.string().min(1, 'Opérateur requis'),
  typology: z.string().optional(),
  source: z.string().optional(),
  amount: z.preprocess(normalizeDecimal, z.coerce.number().positive('Montant requis')),
  margin: z.preprocess(blankToUndefined, z.coerce.number().optional()),
  feesRate: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(100).optional()),
  committee: z.enum(['PAS_DE_COMITE', 'VALIDE', 'CONDITIONS_SUSPENSIVES', 'REFUSE']),
  decision: z.string().optional(),
  prequalificationCaseId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// Sentinel Radix Select value pour "aucun dossier lié" — un <SelectItem> ne
// peut pas avoir value="" (réservé en interne par Radix pour "vide").
const NO_PREQUAL_CASE = '__none__';

export function CreatePipelineEntryDialog() {
  const [open, setOpen] = useState(false);
  const createEntry = useCreatePipelineEntry();
  // Dossiers non archivés seulement — un dossier archivé n'a plus de sens à
  // lier à un nouveau dossier pipeline. Ne filtre pas sur "déjà lié" côté
  // client (le backend le refuse proprement) pour rester simple.
  const { data: prequalCases } = usePrequalificationCases();
  const linkableCases = (prequalCases ?? []).filter((c) => c.status !== 'ARCHIVED');
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { committee: 'PAS_DE_COMITE', prequalificationCaseId: NO_PREQUAL_CASE } });

  const onSubmit = (values: FormValues) => {
    // '' plutôt qu'undefined : le formulaire est la source de vérité à la
    // soumission, "Aucun" doit se traduire par "aucun lien", jamais par "ne
    // rien envoyer" qui laisserait un lien précédent en place à l'insu de
    // l'utilisateur (voir edit-pipeline-entry-dialog, même logique).
    const payload = { ...values, prequalificationCaseId: values.prequalificationCaseId === NO_PREQUAL_CASE ? '' : values.prequalificationCaseId };
    createEntry.mutate(payload, { onSuccess: () => { setOpen(false); reset(); } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nouveau dossier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau dossier reçu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="operator">Opérateur</Label>
              <Input id="operator" {...register('operator')} />
              {errors.operator && <p className="text-xs text-destructive">{errors.operator.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="typology">Typologie</Label>
              <Input id="typology" placeholder="Marchand de biens avec travaux" {...register('typology')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Source (apporteur)</Label>
              <Input id="source" {...register('source')} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Montant (€)</Label>
              <DecimalInput id="amount" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="margin">Marge (%)</Label>
              <DecimalInput id="margin" {...register('margin')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feesRate">Fees ATLAS (%)</Label>
              <DecimalInput id="feesRate" {...register('feesRate')} />
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
            <Label htmlFor="decision">Décision / commentaire</Label>
            <Input id="decision" {...register('decision')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Dossier de préqualification lié (optionnel)</Label>
            <Controller
              control={control}
              name="prequalificationCaseId"
              render={({ field }) => (
                <Select value={field.value ?? NO_PREQUAL_CASE} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PREQUAL_CASE}>Aucun</SelectItem>
                    {linkableCases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {PREQUALIFICATION_STATUS_LABELS[c.status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-[11px] text-muted-foreground">
              Rapproche ce dossier pipeline du dossier Préqual dont il est issu — les deux statuts restent distincts et s'affichent chacun de leur côté.
            </p>
          </div>
          {createEntry.isError && (
            <p className="text-xs text-destructive">
              {createEntry.error instanceof ApiError ? createEntry.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
