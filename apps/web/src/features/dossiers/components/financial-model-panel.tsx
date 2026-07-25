import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
type FormValues = z.infer<typeof schema>;

export function FinancialModelPanel({ dealId }: { dealId: string }) {
  const { data, isLoading } = useFinancialModel(dealId);
  const save = useSaveFinancialModel(dealId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (data?.assumption) {
      reset({ ...data.assumption, targetMarginPct: data.assumption.targetMarginPct ?? undefined });
    }
  }, [data, reset]);

  const onSubmit = (values: FormValues) => save.mutate(values);

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
