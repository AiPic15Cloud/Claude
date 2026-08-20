import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialModel, useSaveFinancialModel } from '../hooks/use-financial-model';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const schema = z.object({
  surfaceSqm: z.coerce.number().positive('Surface requise'),
  constructionCostPerSqm: z.coerce.number().positive('Coût requis'),
  sellingPricePerSqm: z.coerce.number().positive('Prix requis'),
  otherCosts: z.coerce.number().min(0).optional(),
  targetMarginPct: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});
export type FinancialModelFormValues = z.infer<typeof schema>;
type FormValues = FinancialModelFormValues;

interface FinancialModelPanelProps {
  dealId: string;
  /** Values proposed by the BP extraction — applied once, then the parent should clear it via onPrefillApplied. */
  prefill?: (Partial<FormValues> & { sourceDocumentId?: string }) | null;
  onPrefillApplied?: () => void;
}

export function FinancialModelPanel({ dealId, prefill, onPrefillApplied }: FinancialModelPanelProps) {
  const { data, isLoading } = useFinancialModel(dealId);
  const save = useSaveFinancialModel(dealId);
  const [prefillNotice, setPrefillNotice] = useState(false);
  const [sourceDocumentId, setSourceDocumentId] = useState<string | undefined>();

  const { register, handleSubmit, reset, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (data?.assumption) {
      reset({ ...data.assumption, targetMarginPct: data.assumption.targetMarginPct ?? undefined });
    }
  }, [data, reset]);

  useEffect(() => {
    if (prefill) {
      const { sourceDocumentId: docId, ...values } = prefill;
      reset({ ...getValues(), ...values });
      setPrefillNotice(true);
      setSourceDocumentId(docId);
      onPrefillApplied?.();
    }
    // getValues/reset/onPrefillApplied are stable across renders here; only re-run when a new prefill arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const onSubmit = (values: FormValues) =>
    save.mutate(
      { ...values, sourceDocumentId },
      {
        onSuccess: () => {
          setPrefillNotice(false);
          setSourceDocumentId(undefined);
        },
      },
    );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Hypothèses</CardTitle>
        </CardHeader>
        <CardContent>
          {prefillNotice && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="flex-1">Valeurs proposées par l'IA à partir d'un document déposé — vérifiez-les avant d'enregistrer.</p>
              <button type="button" onClick={() => setPrefillNotice(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="surfaceSqm">Surface (m²)</Label>
                <Input id="surfaceSqm" type="number" min={0} {...register('surfaceSqm')} />
                {errors.surfaceSqm && <p className="text-xs text-destructive">{errors.surfaceSqm.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otherCosts">Autres coûts (€)</Label>
                <Input id="otherCosts" type="number" min={0} {...register('otherCosts')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="constructionCostPerSqm">Coût construction (€/m²)</Label>
                <Input id="constructionCostPerSqm" type="number" min={0} {...register('constructionCostPerSqm')} />
                {errors.constructionCostPerSqm && (
                  <p className="text-xs text-destructive">{errors.constructionCostPerSqm.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sellingPricePerSqm">Prix de vente (€/m²)</Label>
                <Input id="sellingPricePerSqm" type="number" min={0} {...register('sellingPricePerSqm')} />
                {errors.sellingPricePerSqm && (
                  <p className="text-xs text-destructive">{errors.sellingPricePerSqm.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="targetMarginPct">Marge cible (%)</Label>
                <Input id="targetMarginPct" type="number" min={0} max={100} step={0.5} {...register('targetMarginPct')} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...register('notes')} />
            </div>
            <Button type="submit" className="self-end" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sensibilité</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.sensitivity ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Renseignez les hypothèses pour calculer la valorisation et sa sensibilité.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.sensitivity.map((scenario) => (
                <div
                  key={scenario.label}
                  className={cn(
                    'flex items-center justify-between rounded-md border p-3',
                    scenario.label === 'Base' ? 'border-primary/40 bg-primary/5' : 'border-border',
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{scenario.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {scenario.sellingPricePerSqm} €/m² vente · {scenario.constructionCostPerSqm} €/m² coût
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(scenario.margin)}</p>
                    <p className="text-xs text-muted-foreground">marge {scenario.marginPct}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
