import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialModel, useSaveFinancialModel } from '../hooks/use-financial-model';
import { ValidationBadge } from './validation-badge';
import { CostLineItemsEditor } from './cost-line-items-editor';
import { FinancialSynthesisCard } from './financial-synthesis-card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const schema = z.object({
  surfaceSqm: z.coerce.number().positive('Surface requise'),
  sellingPricePerSqm: z.coerce.number().positive('Prix requis'),
  targetMarginPct: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  landPrice: z.coerce.number().min(0).optional(),
  notaryFees: z.coerce.number().min(0).optional(),
  diagnosticsCost: z.coerce.number().min(0).optional(),
  insuranceCost: z.coerce.number().min(0).optional(),
  propertyTaxCost: z.coerce.number().min(0).optional(),
  surveyStudiesCost: z.coerce.number().min(0).optional(),
  agencyFees: z.coerce.number().min(0).optional(),
  referralFees: z.coerce.number().min(0).optional(),
  bankMiscFees: z.coerce.number().min(0).optional(),
  lpbFeesPctHT: z.coerce.number().min(0).optional(),
  lpbTvaApplicable: z.boolean().optional(),
  lpbTvaRatePct: z.coerce.number().min(0).optional(),
  lpbDurationMinMonths: z.coerce.number().min(0).optional(),
  lpbDurationMaxMonths: z.coerce.number().min(0).optional(),
  bankName: z.string().optional(),
  bankLoanAcquisition: z.coerce.number().min(0).optional(),
  bankLoanAccompagnement: z.coerce.number().min(0).optional(),
  bankInterestRatePct: z.coerce.number().min(0).optional(),
  bankFileFees: z.coerce.number().min(0).optional(),
  bankGuaranteeFees: z.coerce.number().min(0).optional(),
});
export type FinancialModelFormValues = z.infer<typeof schema>;
type FormValues = FinancialModelFormValues;

interface FinancialModelPanelProps {
  dealId: string;
  /** Taux et durée cible du financement LPB — déjà saisis au niveau du dossier, affichés en lecture seule ici pour éviter un doublon de saisie. */
  dealInterestRate?: number | null;
  dealDurationMonths?: number | null;
  /** Values proposed by the BP extraction — applied once, then the parent should clear it via onPrefillApplied. */
  prefill?: (Partial<FormValues> & { sourceDocumentId?: string }) | null;
  onPrefillApplied?: () => void;
}

export function FinancialModelPanel({ dealId, dealInterestRate, dealDurationMonths, prefill, onPrefillApplied }: FinancialModelPanelProps) {
  const { data, isLoading } = useFinancialModel(dealId);
  const save = useSaveFinancialModel(dealId);
  const [prefillNotice, setPrefillNotice] = useState(false);
  const [sourceDocumentId, setSourceDocumentId] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data?.assumption) {
      reset({
        ...data.assumption,
        targetMarginPct: data.assumption.targetMarginPct ?? undefined,
        notes: data.assumption.notes ?? undefined,
        landPrice: data.assumption.landPrice ?? undefined,
        notaryFees: data.assumption.notaryFees ?? undefined,
        diagnosticsCost: data.assumption.diagnosticsCost ?? undefined,
        insuranceCost: data.assumption.insuranceCost ?? undefined,
        propertyTaxCost: data.assumption.propertyTaxCost ?? undefined,
        surveyStudiesCost: data.assumption.surveyStudiesCost ?? undefined,
        agencyFees: data.assumption.agencyFees ?? undefined,
        referralFees: data.assumption.referralFees ?? undefined,
        bankMiscFees: data.assumption.bankMiscFees ?? undefined,
        lpbFeesPctHT: data.assumption.lpbFeesPctHT ?? undefined,
        lpbTvaApplicable: data.assumption.lpbTvaApplicable,
        lpbTvaRatePct: data.assumption.lpbTvaRatePct ?? undefined,
        lpbDurationMinMonths: data.assumption.lpbDurationMinMonths ?? undefined,
        lpbDurationMaxMonths: data.assumption.lpbDurationMaxMonths ?? undefined,
        bankName: data.assumption.bankName ?? undefined,
        bankLoanAcquisition: data.assumption.bankLoanAcquisition ?? undefined,
        bankLoanAccompagnement: data.assumption.bankLoanAccompagnement ?? undefined,
        bankInterestRatePct: data.assumption.bankInterestRatePct ?? undefined,
        bankFileFees: data.assumption.bankFileFees ?? undefined,
        bankGuaranteeFees: data.assumption.bankGuaranteeFees ?? undefined,
      });
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Hypothèses</CardTitle>
          {data?.assumption && <ValidationBadge dealId={dealId} entityType="FinancialAssumption" />}
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
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="surfaceSqm">Surface (m²)</Label>
                <Input id="surfaceSqm" type="number" min={0} {...register('surfaceSqm')} />
                {errors.surfaceSqm && <p className="text-xs text-destructive">{errors.surfaceSqm.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sellingPricePerSqm">Prix de vente (€/m²)</Label>
                <Input id="sellingPricePerSqm" type="number" min={0} {...register('sellingPricePerSqm')} />
                {errors.sellingPricePerSqm && <p className="text-xs text-destructive">{errors.sellingPricePerSqm.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="targetMarginPct">Marge cible (%)</Label>
                <Input id="targetMarginPct" type="number" min={0} max={100} step={0.5} {...register('targetMarginPct')} />
              </div>
            </div>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Foncier</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="landPrice">Prix d'acquisition (€)</Label>
                  <Input id="landPrice" type="number" min={0} {...register('landPrice')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notaryFees">Frais de notaire (€)</Label>
                  <Input id="notaryFees" type="number" min={0} {...register('notaryFees')} />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Travaux</h3>
              <CostLineItemsEditor
                dealId={dealId}
                category="TRAVAUX"
                items={data?.travauxItems ?? []}
                totalLabel="Total travaux"
                placeholder="Ex. Gros œuvre"
              />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Honoraires techniques</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="diagnosticsCost">Diagnostics (€)</Label>
                  <Input id="diagnosticsCost" type="number" min={0} {...register('diagnosticsCost')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="insuranceCost">Assurance (€)</Label>
                  <Input id="insuranceCost" type="number" min={0} {...register('insuranceCost')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="propertyTaxCost">Taxe foncière (€)</Label>
                  <Input id="propertyTaxCost" type="number" min={0} {...register('propertyTaxCost')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="surveyStudiesCost">Géomètre / études (€)</Label>
                  <Input id="surveyStudiesCost" type="number" min={0} {...register('surveyStudiesCost')} />
                </div>
              </div>
              <CostLineItemsEditor
                dealId={dealId}
                category="HONORAIRES_TECHNIQUES"
                items={data?.honorairesTechniquesItems ?? []}
                totalLabel="Total postes additionnels"
                placeholder="Ex. Contrôle technique"
              />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Autres frais</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="agencyFees">Honoraires d'agence (€)</Label>
                  <Input id="agencyFees" type="number" min={0} placeholder="0" {...register('agencyFees')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="referralFees">Apport d'affaires (€)</Label>
                  <Input id="referralFees" type="number" min={0} placeholder="0" {...register('referralFees')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankMiscFees">Frais bancaires divers (€)</Label>
                  <Input id="bankMiscFees" type="number" min={0} {...register('bankMiscFees')} />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Financement LPB</h3>
              <p className="text-xs text-muted-foreground">
                Collecte, taux ({dealInterestRate ?? '—'}%) et durée cible ({dealDurationMonths ?? '—'} mois) sont ceux du dossier — à modifier via
                "Modifier" en haut de page.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lpbFeesPctHT">Fees HT (%)</Label>
                  <Input id="lpbFeesPctHT" type="number" min={0} step={0.1} {...register('lpbFeesPctHT')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lpbTvaRatePct">Taux de TVA (%)</Label>
                  <Input id="lpbTvaRatePct" type="number" min={0} step={0.1} {...register('lpbTvaRatePct')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lpbDurationMinMonths">Durée min (mois)</Label>
                  <Input id="lpbDurationMinMonths" type="number" min={0} {...register('lpbDurationMinMonths')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lpbDurationMaxMonths">Durée max (mois)</Label>
                  <Input id="lpbDurationMaxMonths" type="number" min={0} {...register('lpbDurationMaxMonths')} />
                </div>
              </div>
              <Controller
                control={control}
                name="lpbTvaApplicable"
                render={({ field }) => (
                  <div className="flex items-center gap-2.5">
                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} id="lpbTvaApplicable" />
                    <Label htmlFor="lpbTvaApplicable" className="cursor-pointer font-normal">
                      TVA applicable sur les fees
                    </Label>
                  </div>
                )}
              />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Financement bancaire (optionnel)</h3>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bankName">Banque</Label>
                <Input id="bankName" placeholder="Laisser vide si aucun financement bancaire" {...register('bankName')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankLoanAcquisition">Crédit acquisition (€)</Label>
                  <Input id="bankLoanAcquisition" type="number" min={0} {...register('bankLoanAcquisition')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankLoanAccompagnement">Crédit accompagnement (€)</Label>
                  <Input id="bankLoanAccompagnement" type="number" min={0} {...register('bankLoanAccompagnement')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankInterestRatePct">Taux (%)</Label>
                  <Input id="bankInterestRatePct" type="number" min={0} step={0.1} {...register('bankInterestRatePct')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankFileFees">Frais de dossier (€)</Label>
                  <Input id="bankFileFees" type="number" min={0} {...register('bankFileFees')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankGuaranteeFees">Frais de garantie (€)</Label>
                  <Input id="bankGuaranteeFees" type="number" min={0} {...register('bankGuaranteeFees')} />
                </div>
              </div>
            </section>

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

      <div className="flex flex-col gap-4">
        {data?.synthesis && <FinancialSynthesisCard synthesis={data.synthesis} />}

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
    </div>
  );
}
