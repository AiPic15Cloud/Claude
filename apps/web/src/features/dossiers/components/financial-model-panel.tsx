import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialModel, useSaveFinancialModel, useDeleteFinancialModel, useBpComparison } from '../hooks/use-financial-model';
import { useUpdateDeal } from '@/features/portfolio/hooks/use-deals';
import { ValidationBadge } from './validation-badge';
import { CostLineItemsEditor } from './cost-line-items-editor';
import { SaleLotsEditor } from './sale-lots-editor';
import { FinancialSynthesisCard } from './financial-synthesis-card';
import { BpComparisonCard } from './bp-comparison-card';
import { SensitivityComparisonCard } from './sensitivity-comparison-card';
import { formatCurrency } from '@/lib/format';
import { marginTier, MARGIN_TIER_STYLES } from '@/lib/margin';
import { cn } from '@/lib/utils';

// z.coerce.number() sur une chaîne vide donne 0 (Number('') === 0), pas
// undefined — .optional() ne rattrape rien puisque 0 est une valeur "valide".
// Un champ laissé vide (saisie du modèle financier étalée sur plusieurs
// sauvegardes) serait donc enregistré comme "explicitement mis à 0", ce qui
// pollue l'historique des valeurs. Le preprocess normalise '' en undefined
// avant coercition pour que "pas encore rempli" reste "pas encore rempli".
const optionalNumber = (max?: number) => {
  const base = max !== undefined ? z.coerce.number().min(0).max(max) : z.coerce.number().min(0);
  return z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : v), base.optional());
};

const schema = z.object({
  surfaceSqm: z.coerce.number().positive('Surface requise'),
  sellingPricePerSqm: z.coerce.number().positive('Prix requis'),
  targetMarginPct: optionalNumber(100),
  notes: z.string().optional(),
  landPrice: optionalNumber(),
  notaryFees: optionalNumber(),
  diagnosticsCost: optionalNumber(),
  insuranceCost: optionalNumber(),
  propertyTaxCost: optionalNumber(),
  surveyStudiesCost: optionalNumber(),
  agencyFees: optionalNumber(),
  referralFees: optionalNumber(),
  bankMiscFees: optionalNumber(),
  lpbFeesPctHT: optionalNumber(),
  lpbTvaApplicable: z.boolean().optional(),
  lpbTvaRatePct: optionalNumber(),
  lpbDurationMinMonths: optionalNumber(),
  lpbDurationMaxMonths: optionalNumber(),
  latePenaltyApplied: z.boolean().optional(),
  bankName: z.string().optional(),
  bankLoanAcquisition: optionalNumber(),
  bankLoanAccompagnement: optionalNumber(),
  bankInterestRatePct: optionalNumber(),
  bankFileFees: optionalNumber(),
  bankGuaranteeFees: optionalNumber(),
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
  const { data: bpComparison } = useBpComparison(dealId);
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

  const deleteFinancialModel = useDeleteFinancialModel(dealId);
  const [confirmingDeleteModel, setConfirmingDeleteModel] = useState(false);
  const handleDeleteModel = () => {
    if (!confirmingDeleteModel) {
      setConfirmingDeleteModel(true);
      return;
    }
    deleteFinancialModel.mutate(undefined, { onSuccess: () => setConfirmingDeleteModel(false) });
  };

  // `data` change aussi pour des raisons SANS RAPPORT avec ce formulaire — ex. éditer la
  // "durée cible" ci-dessous invalide et refetch la query financial-model pour rafraîchir
  // la Synthèse, ce qui déclenchait un reset() complet du formulaire et effaçait toute
  // saisie en cours non enregistrée dans les autres champs (Honoraires techniques, Autres
  // frais...). On ne resynchronise donc le formulaire que (a) au tout premier chargement de
  // ce dossier, ou (b) juste après NOTRE PROPRE enregistrement (onSubmit ci-dessous) — jamais
  // sur un refetch déclenché par ailleurs pendant que l'utilisateur est en train de saisir.
  const initializedForDealRef = useRef<string | null>(null);
  const justSavedRef = useRef(false);

  useEffect(() => {
    if (!data?.assumption) return;
    const isFirstLoadForThisDeal = initializedForDealRef.current !== dealId;
    if (!isFirstLoadForThisDeal && !justSavedRef.current) return;
    initializedForDealRef.current = dealId;
    justSavedRef.current = false;
    // Champs texte/nombre optionnels non renseignés : reset() à '' plutôt qu'undefined.
    // RHF calcule isDirty en comparant les valeurs par défaut à ce que contient
    // réellement le DOM des <input> non contrôlés (register()) — un input HTML vide
    // vaut toujours '', jamais undefined. Reset à undefined crée donc un écart
    // ('' côté DOM vs undefined côté défaut) qui laisse isDirty bloqué à true en
    // permanence dès qu'un champ optionnel est vide, même juste après un enregistrement
    // réussi (bannière "Modifications non enregistrées" qui ne se referme jamais).
    // Le preprocess zod du schéma traite déjà '' comme "non renseigné" à la soumission.
    reset({
        ...data.assumption,
        targetMarginPct: data.assumption.targetMarginPct ?? '',
        notes: data.assumption.notes ?? '',
        landPrice: data.assumption.landPrice ?? '',
        notaryFees: data.assumption.notaryFees ?? '',
        diagnosticsCost: data.assumption.diagnosticsCost ?? '',
        insuranceCost: data.assumption.insuranceCost ?? '',
        propertyTaxCost: data.assumption.propertyTaxCost ?? '',
        surveyStudiesCost: data.assumption.surveyStudiesCost ?? '',
        agencyFees: data.assumption.agencyFees ?? '',
        referralFees: data.assumption.referralFees ?? '',
        bankMiscFees: data.assumption.bankMiscFees ?? '',
        lpbFeesPctHT: data.assumption.lpbFeesPctHT ?? '',
        lpbTvaApplicable: data.assumption.lpbTvaApplicable,
        lpbTvaRatePct: data.assumption.lpbTvaRatePct ?? '',
        lpbDurationMinMonths: data.assumption.lpbDurationMinMonths ?? '',
        lpbDurationMaxMonths: data.assumption.lpbDurationMaxMonths ?? '',
        latePenaltyApplied: data.assumption.latePenaltyApplied,
        bankName: data.assumption.bankName ?? '',
        bankLoanAcquisition: data.assumption.bankLoanAcquisition ?? '',
        bankLoanAccompagnement: data.assumption.bankLoanAccompagnement ?? '',
        bankInterestRatePct: data.assumption.bankInterestRatePct ?? '',
        bankFileFees: data.assumption.bankFileFees ?? '',
        bankGuaranteeFees: data.assumption.bankGuaranteeFees ?? '',
        // '' n'est pas assignable au type number|undefined résolu par zod (FormValues est le
        // type de SORTIE, après coercition) — mais c'est bien la forme attendue par register()
        // avant soumission, et le preprocess du schéma la retraite normalement au submit suivant.
      } as FormValues);
  }, [data, dealId, reset]);

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

  const onSubmit = (values: FormValues) => {
    justSavedRef.current = true;
    save.mutate(
      { ...values, sourceDocumentId },
      {
        onSuccess: () => {
          setPrefillNotice(false);
          setSourceDocumentId(undefined);
        },
        onError: () => {
          justSavedRef.current = false;
        },
      },
    );
  };

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
          <div className="flex items-center gap-2">
            {data?.assumption && <ValidationBadge dealId={dealId} entityType="FinancialAssumption" />}
            {data?.assumption && confirmingDeleteModel && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingDeleteModel(false)}>
                Annuler
              </Button>
            )}
            {data?.assumption && (
              <Button
                type="button"
                size="sm"
                variant={confirmingDeleteModel ? 'destructive' : 'ghost'}
                className={confirmingDeleteModel ? '' : 'text-destructive hover:text-destructive'}
                onClick={handleDeleteModel}
                disabled={deleteFinancialModel.isPending}
              >
                {deleteFinancialModel.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {confirmingDeleteModel ? 'Confirmer la suppression' : ''}
              </Button>
            )}
          </div>
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
              <Controller
                control={control}
                name="latePenaltyApplied"
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          // Enregistre immédiatement — sinon la Synthèse, le BP actualisé et la
                          // Sensibilité (calculés côté serveur depuis les données déjà enregistrées)
                          // continuent d'afficher l'ancien taux tant que l'utilisateur n'a pas cliqué
                          // sur "Enregistrer" séparément, ce qui donne l'impression que la case n'a
                          // aucun effet.
                          void handleSubmit(onSubmit)();
                        }}
                        id="latePenaltyApplied"
                      />
                      <Label htmlFor="latePenaltyApplied" className="cursor-pointer font-normal">
                        Simuler la pénalité de retard (+5 pts sur le taux)
                      </Label>
                    </div>
                    {data?.synthesis?.lpb.latePenaltyAuto ? (
                      <p className="rounded-md border border-warning/30 bg-warning/5 px-2 py-1.5 text-[11px] text-warning">
                        Durée cible du financement dépassée — la pénalité est déjà appliquée automatiquement au calcul réel, indépendamment de ce réglage.
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        {field.value
                          ? `Taux utilisé pour les intérêts : ${dealInterestRate ?? '—'}% + 5 pts = ${dealInterestRate !== null && dealInterestRate !== undefined ? dealInterestRate + 5 : '—'}%. Impact visible dans la Synthèse & ratios ci-contre.`
                          : "N'affecte que le calcul des intérêts affiché — le taux du dossier n'est pas modifié. S'applique automatiquement, sans ce réglage, dès que la durée cible du financement est réellement dépassée."}
                      </p>
                    )}
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
        {bpComparison && <BpComparisonCard dealId={dealId} comparison={bpComparison} />}

        {bpComparison?.locked && bpComparison.sensitivity ? (
          <SensitivityComparisonCard initial={bpComparison.sensitivity.initial} current={bpComparison.sensitivity.current} />
        ) : (
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
        )}
      </div>
    </div>
  );
}
