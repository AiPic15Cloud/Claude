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
import { useUpdateDeal } from '@/features/portfolio/hooks/use-deals';
import { ValidationBadge } from './validation-badge';
import { CostLineItemsEditor } from './cost-line-items-editor';
import { SaleLotsEditor } from './sale-lots-editor';
import { FinancialSynthesisCard } from './financial-synthesis-card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Mêmes seuils que MARGIN_SCALE (apps/api/src/agents/agent-registry.ts) —
 * la grille de couleur que les agents IA appliquent déjà en texte (🟢🟡🟠🔴).
 * Garder ces deux définitions synchronisées si les seuils changent.
 */
function marginTier(marginPct: number): 'vert' | 'jaune' | 'orange' | 'rouge' {
  if (marginPct > 30) return 'vert';
  if (marginPct >= 20) return 'jaune';
  if (marginPct >= 10) return 'orange';
  return 'rouge';
}

const MARGIN_TIER_STYLES: Record<ReturnType<typeof marginTier>, { dot: string; text: string; border: string; bg: string }> = {
  vert: { dot: '🟢', text: 'text-success', border: 'border-success/40', bg: 'bg-success/5' },
  jaune: { dot: '🟡', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/5' },
  orange: { dot: '🟠', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/5' },
  rouge: { dot: '🔴', text: 'text-destructive', border: 'border-destructive/40', bg: 'bg-destructive/5' },
};

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
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const watched = watch();
  // react-hook-form garde la valeur brute de l'input (une string) tant que le champ n'est pas
  // passé par le resolver zod — Number.isFinite("900") vaut false, d'où le Number(v) explicite
  // avant de vérifier la finitude.
  const n = (v: number | string | undefined) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };
  // Sous-totaux recalculés en direct depuis le formulaire (pas depuis data.synthesis, qui
  // ne reflète que le dernier enregistrement) — évite qu'un champ tapé mais pas encore
  // enregistré (ex. Taxe foncière) semble "manquant" tant que l'utilisateur n'a pas cliqué
  // sur Enregistrer. Sommes pures uniquement (pas de LTA/LTC/LTV/marge, qui restent
  // affichées côté serveur dans la carte Synthèse & ratios).
  const liveFoncierTotal = n(watched.landPrice) + n(watched.notaryFees);
  const liveHonorairesTechniquesTotal =
    n(watched.diagnosticsCost) +
    n(watched.insuranceCost) +
    n(watched.propertyTaxCost) +
    n(watched.surveyStudiesCost) +
    (data?.honorairesTechniquesItems ?? []).reduce((sum, item) => sum + item.amount, 0);
  const liveAutresFraisScalaires = n(watched.agencyFees) + n(watched.referralFees) + n(watched.bankMiscFees);

  // Durée cible : champ du dossier (Deal.durationMonths), pas du modèle financier — mais les
  // intérêts LPB/bancaires sont calculés sur cette durée, donc éditable directement ici plutôt
  // que de forcer un aller-retour par "Modifier" en haut de page.
  const updateDeal = useUpdateDeal(dealId);
  const [durationDraft, setDurationDraft] = useState<string>('');
  useEffect(() => {
    setDurationDraft(dealDurationMonths !== null && dealDurationMonths !== undefined ? String(dealDurationMonths) : '');
  }, [dealDurationMonths]);
  const saveDuration = () => {
    const value = Number(durationDraft);
    if (!Number.isFinite(value) || value <= 0) return;
    if (value === dealDurationMonths) return;
    updateDeal.mutate({ durationMonths: Math.round(value) });
  };

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
          {isDirty && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              Modifications non enregistrées — la carte "Synthèse & ratios" reflète encore la dernière version enregistrée. Cliquez sur "Enregistrer"
              pour la mettre à jour.
            </div>
          )}
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
                <Input id="surfaceSqm" type="number" step="any" min={0} {...register('surfaceSqm')} />
                {errors.surfaceSqm && <p className="text-xs text-destructive">{errors.surfaceSqm.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sellingPricePerSqm">Prix de vente moyen (€/m²)</Label>
                <Input id="sellingPricePerSqm" type="number" step="any" min={0} {...register('sellingPricePerSqm')} />
                {errors.sellingPricePerSqm && <p className="text-xs text-destructive">{errors.sellingPricePerSqm.message}</p>}
                <p className="text-xs text-muted-foreground">Utilisé tant qu'aucun lot n'est saisi ci-dessous.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="targetMarginPct">Marge cible (%)</Label>
                <Input id="targetMarginPct" type="number" min={0} max={100} step="any" {...register('targetMarginPct')} />
              </div>
            </div>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Grille de commercialisation</h3>
              <SaleLotsEditor dealId={dealId} lots={data?.saleLots ?? []} />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Foncier</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="landPrice">Prix d'acquisition (€)</Label>
                  <Input id="landPrice" type="number" step="any" min={0} {...register('landPrice')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notaryFees">Frais de notaire (€)</Label>
                  <Input id="notaryFees" type="number" step="any" min={0} {...register('notaryFees')} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Total foncier : <span className="font-medium text-foreground">{formatCurrency(liveFoncierTotal)}</span></p>
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
                  <Input id="diagnosticsCost" type="number" step="any" min={0} {...register('diagnosticsCost')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="insuranceCost">Assurance (€)</Label>
                  <Input id="insuranceCost" type="number" step="any" min={0} {...register('insuranceCost')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="propertyTaxCost">Taxe foncière (€)</Label>
                  <Input id="propertyTaxCost" type="number" step="any" min={0} {...register('propertyTaxCost')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="surveyStudiesCost">Géomètre / études (€)</Label>
                  <Input id="surveyStudiesCost" type="number" step="any" min={0} {...register('surveyStudiesCost')} />
                </div>
              </div>
              <CostLineItemsEditor
                dealId={dealId}
                category="HONORAIRES_TECHNIQUES"
                items={data?.honorairesTechniquesItems ?? []}
                totalLabel="Total postes additionnels"
                placeholder="Ex. Contrôle technique"
              />
              <p className="text-xs text-muted-foreground">
                Total honoraires techniques (4 champs + postes additionnels) :{' '}
                <span className="font-medium text-foreground">{formatCurrency(liveHonorairesTechniquesTotal)}</span>
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Autres frais</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="agencyFees">Honoraires d'agence (€)</Label>
                  <Input id="agencyFees" type="number" step="any" min={0} placeholder="0" {...register('agencyFees')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="referralFees">Apport d'affaires (€)</Label>
                  <Input id="referralFees" type="number" step="any" min={0} placeholder="0" {...register('referralFees')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankMiscFees">Frais bancaires divers (€)</Label>
                  <Input id="bankMiscFees" type="number" step="any" min={0} {...register('bankMiscFees')} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sous-total agence + apport d'affaires + bancaire divers (hors frais LPB, calculés) :{' '}
                <span className="font-medium text-foreground">{formatCurrency(liveAutresFraisScalaires)}</span>
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Financement LPB</h3>
              <p className="text-xs text-muted-foreground">
                Collecte et taux ({dealInterestRate ?? '—'}%) sont ceux du dossier — à modifier via "Modifier" en haut de page.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dealDurationMonths">Durée cible (mois)</Label>
                  <Input
                    id="dealDurationMonths"
                    type="number"
                    step="any"
                    min={1}
                    value={durationDraft}
                    onChange={(e) => setDurationDraft(e.target.value)}
                    onBlur={saveDuration}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {updateDeal.isPending ? 'Enregistrement…' : "Sert au calcul des intérêts LPB et bancaires (durée cible × taux)."}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lpbFeesPctHT">Fees HT (%)</Label>
                  <Input id="lpbFeesPctHT" type="number" min={0} step="any" {...register('lpbFeesPctHT')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lpbTvaRatePct">Taux de TVA (%)</Label>
                  <Input id="lpbTvaRatePct" type="number" min={0} step="any" {...register('lpbTvaRatePct')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lpbDurationMinMonths">Durée min (mois)</Label>
                  <Input id="lpbDurationMinMonths" type="number" step="any" min={0} {...register('lpbDurationMinMonths')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lpbDurationMaxMonths">Durée max (mois)</Label>
                  <Input id="lpbDurationMaxMonths" type="number" step="any" min={0} {...register('lpbDurationMaxMonths')} />
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
                  <Input id="bankLoanAcquisition" type="number" step="any" min={0} {...register('bankLoanAcquisition')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankLoanAccompagnement">Crédit accompagnement (€)</Label>
                  <Input id="bankLoanAccompagnement" type="number" step="any" min={0} {...register('bankLoanAccompagnement')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankInterestRatePct">Taux (%)</Label>
                  <Input id="bankInterestRatePct" type="number" min={0} step="any" {...register('bankInterestRatePct')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankFileFees">Frais de dossier (€)</Label>
                  <Input id="bankFileFees" type="number" step="any" min={0} {...register('bankFileFees')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankGuaranteeFees">Frais de garantie (€)</Label>
                  <Input id="bankGuaranteeFees" type="number" step="any" min={0} {...register('bankGuaranteeFees')} />
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
              <>
              <div className="flex flex-col gap-2">
                {data.sensitivity.map((scenario) => {
                  const tier = marginTier(scenario.marginPct);
                  const style = MARGIN_TIER_STYLES[tier];
                  return (
                    <div
                      key={scenario.label}
                      className={cn(
                        'flex items-center justify-between rounded-md border p-3',
                        scenario.label === 'Base' ? `${style.border} ${style.bg}` : 'border-border',
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
                        <p className={cn('text-xs font-medium tabular-nums', style.text)}>
                          {style.dot} marge {scenario.marginPct}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                🟢 &gt; 30 % · 🟡 20–30 % · 🟠 10–20 % · 🔴 &lt; 10 % — mêmes seuils que la grille appliquée par les agents IA.
              </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
