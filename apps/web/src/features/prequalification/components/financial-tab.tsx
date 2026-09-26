import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { marginTier, MARGIN_TIER_STYLES } from '@/lib/margin';
import { parseLocaleNumber } from '@/lib/locale-number';
import { cn } from '@/lib/utils';
import { useUpsertFinancialModel, usePrequalBpComparison } from '../hooks/use-prequalification';
import { PrequalBpComparisonCard } from './prequal-bp-comparison-card';
import { FinancialSynthesisCard } from '@/features/dossiers/components/financial-synthesis-card';
import { CovenantsCard } from '@/features/dossiers/components/covenants-card';
import { SensitivityComparisonCard } from '@/features/dossiers/components/sensitivity-comparison-card';
import type { PrequalFinancialModel } from '@/types';

function pct(value: number | null | undefined): string {
  return value != null ? `${value.toFixed(1)} %` : '—';
}

interface CostItem {
  label: string;
  amount: string;
}

function CostItemsList({ items, onChange, placeholder }: { items: CostItem[]; onChange: (items: CostItem[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState<CostItem>({ label: '', amount: '' });
  const total = items.reduce((sum, i) => sum + (parseLocaleNumber(i.amount) || 0), 0);

  const add = () => {
    if (!draft.label || !draft.amount) return;
    onChange([...items, draft]);
    setDraft({ label: '', amount: '' });
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
          <span className="text-sm">{item.label}</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium tabular-nums">{formatCurrency(parseLocaleNumber(item.amount) || 0)}</span>
            <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder={placeholder} className="flex-1" />
        <DecimalInput value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="Montant" className="w-32" />
        <Button type="button" size="icon" variant="ghost" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-sm">
        <span className="font-medium">Total postes</span>
        <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

/**
 * Bilan financier (spec §9.3), aligné sur le modèle financier réel du Deal
 * (financial-model-panel.tsx) à la demande explicite de l'utilisateur, qui a
 * fourni le classeur d'audit réel comme référence — Foncier / Travaux /
 * Honoraires techniques / Autres frais / Financement ATLAS / Financement
 * bancaire optionnel / Ratios de couverture et de covenant / BP initial vs
 * actualisé / Sensibilité. Les données "déclarées" par l'opérateur restent
 * saisies ici pour comparaison explicite à la version ATLAS recalculée (spec
 * §15, point 8) ; toutes les valeurs recalculées viennent de
 * `financial.synthesis`/`.covenants`/`.sensitivity`, produits côté serveur
 * par `prequal-financial.util.ts`/`prequal-covenant.util.ts` — jamais saisies
 * directement.
 */
const s = (v: number | null | undefined) => (v != null ? String(v) : '');

function buildFinancialForm(financial: PrequalFinancialModel | null) {
  return {
    amountRequested: s(financial?.amountRequested),
    declaredEquity: s(financial?.declaredEquity),
    provenEquity: s(financial?.provenEquity),
    declaredMarginPct: s(financial?.declaredMarginPct),
    declaredCoutDeRevient: s(financial?.declaredCoutDeRevient),
    declaredChiffreAffaires: s(financial?.declaredChiffreAffaires),
    otherRevenueRetained: s(financial?.otherRevenueRetained),
    landPrice: s(financial?.landPrice),
    notaryFees: s(financial?.notaryFees),
    diagnosticsCost: s(financial?.diagnosticsCost),
    insuranceCost: s(financial?.insuranceCost),
    propertyTaxCost: s(financial?.propertyTaxCost),
    surveyStudiesCost: s(financial?.surveyStudiesCost),
    agencyFees: s(financial?.agencyFees),
    referralFees: s(financial?.referralFees),
    bankMiscFees: s(financial?.bankMiscFees),
    interestRatePct: s(financial?.interestRatePct),
    durationMinMonths: s(financial?.durationMinMonths),
    durationTargetMonths: s(financial?.durationTargetMonths),
    durationMaxMonths: s(financial?.durationMaxMonths),
    feesPctHT: s(financial?.feesPctHT),
    tvaApplicable: financial?.tvaApplicable ?? false,
    tvaRatePct: s(financial?.tvaRatePct),
    latePenaltyApplied: financial?.latePenaltyApplied ?? false,
    hypothequeEnvisagee: financial?.hypothequeEnvisagee ?? false,
    bankName: financial?.bankName ?? '',
    bankLoanAcquisition: s(financial?.bankLoanAcquisition),
    bankLoanAccompagnement: s(financial?.bankLoanAccompagnement),
    bankInterestRatePct: s(financial?.bankInterestRatePct),
    bankFileFees: s(financial?.bankFileFees),
    bankGuaranteeFees: s(financial?.bankGuaranteeFees),
    resultatOperationnelEstime: s(financial?.resultatOperationnelEstime),
    fluxTresorerieDisponibleEstime: s(financial?.fluxTresorerieDisponibleEstime),
    montantDecaisseNotaire: s(financial?.montantDecaisseNotaire),
    guaranteesNote: financial?.guaranteesNote ?? '',
  };
}

function buildCostItems(financial: PrequalFinancialModel | null, category: string): CostItem[] {
  return financial?.costLineItems.filter((i) => i.category === category).map((i) => ({ label: i.label, amount: String(i.amount) })) ?? [];
}

export function FinancialTab({ caseId, financial }: { caseId: string; financial: PrequalFinancialModel | null }) {
  const upsert = useUpsertFinancialModel(caseId);
  const { data: bpComparison } = usePrequalBpComparison(caseId);

  const [form, setForm] = useState(() => buildFinancialForm(financial));

  const [travauxItems, setTravauxItems] = useState<CostItem[]>(() => buildCostItems(financial, 'TRAVAUX'));
  const [honorairesItems, setHonorairesItems] = useState<CostItem[]>(() => buildCostItems(financial, 'HONORAIRES_TECHNIQUES'));

  useEffect(() => {
    setForm(buildFinancialForm(financial));
    setTravauxItems(buildCostItems(financial, 'TRAVAUX'));
    setHonorairesItems(buildCostItems(financial, 'HONORAIRES_TECHNIQUES'));
  }, [financial]);

  const n = (v: string) => (v === '' ? 0 : parseLocaleNumber(v));
  const liveFoncierTotal = n(form.landPrice) + n(form.notaryFees);
  const liveHonorairesTechniquesTotal =
    n(form.diagnosticsCost) + n(form.insuranceCost) + n(form.propertyTaxCost) + n(form.surveyStudiesCost) + honorairesItems.reduce((sum, i) => sum + n(i.amount), 0);
  const liveAutresFraisScalaires = n(form.agencyFees) + n(form.referralFees) + n(form.bankMiscFees);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opt = (v: string) => (v ? parseLocaleNumber(v) : undefined);
    upsert.mutate({
      amountRequested: opt(form.amountRequested),
      declaredEquity: opt(form.declaredEquity),
      provenEquity: opt(form.provenEquity),
      declaredMarginPct: opt(form.declaredMarginPct),
      declaredCoutDeRevient: opt(form.declaredCoutDeRevient),
      declaredChiffreAffaires: opt(form.declaredChiffreAffaires),
      otherRevenueRetained: opt(form.otherRevenueRetained),
      landPrice: opt(form.landPrice),
      notaryFees: opt(form.notaryFees),
      diagnosticsCost: opt(form.diagnosticsCost),
      insuranceCost: opt(form.insuranceCost),
      propertyTaxCost: opt(form.propertyTaxCost),
      surveyStudiesCost: opt(form.surveyStudiesCost),
      agencyFees: opt(form.agencyFees),
      referralFees: opt(form.referralFees),
      bankMiscFees: opt(form.bankMiscFees),
      interestRatePct: opt(form.interestRatePct),
      durationMinMonths: opt(form.durationMinMonths),
      durationTargetMonths: opt(form.durationTargetMonths),
      durationMaxMonths: opt(form.durationMaxMonths),
      feesPctHT: opt(form.feesPctHT),
      tvaApplicable: form.tvaApplicable,
      tvaRatePct: opt(form.tvaRatePct),
      latePenaltyApplied: form.latePenaltyApplied,
      hypothequeEnvisagee: form.hypothequeEnvisagee,
      bankName: form.bankName || undefined,
      bankLoanAcquisition: opt(form.bankLoanAcquisition),
      bankLoanAccompagnement: opt(form.bankLoanAccompagnement),
      bankInterestRatePct: opt(form.bankInterestRatePct),
      bankFileFees: opt(form.bankFileFees),
      bankGuaranteeFees: opt(form.bankGuaranteeFees),
      resultatOperationnelEstime: opt(form.resultatOperationnelEstime),
      fluxTresorerieDisponibleEstime: opt(form.fluxTresorerieDisponibleEstime),
      montantDecaisseNotaire: opt(form.montantDecaisseNotaire),
      guaranteesNote: form.guaranteesNote || undefined,
      costLineItems: [
        ...travauxItems.filter((i) => i.label && i.amount).map((i) => ({ category: 'TRAVAUX', label: i.label, amount: parseLocaleNumber(i.amount) })),
        ...honorairesItems.filter((i) => i.label && i.amount).map((i) => ({ category: 'HONORAIRES_TECHNIQUES', label: i.label, amount: parseLocaleNumber(i.amount) })),
      ],
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Données déclarées & bilan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Version opérateur (déclarée)</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Montant recherché" value={form.amountRequested} onChange={(v) => setForm((p) => ({ ...p, amountRequested: v }))} />
                <Field label="Apport annoncé" value={form.declaredEquity} onChange={(v) => setForm((p) => ({ ...p, declaredEquity: v }))} />
                <Field label="Apport prouvé" value={form.provenEquity} onChange={(v) => setForm((p) => ({ ...p, provenEquity: v }))} />
                <Field label="Marge annoncée (%)" value={form.declaredMarginPct} onChange={(v) => setForm((p) => ({ ...p, declaredMarginPct: v }))} />
                <Field label="Coût de revient (opérateur)" value={form.declaredCoutDeRevient} onChange={(v) => setForm((p) => ({ ...p, declaredCoutDeRevient: v }))} />
                <Field label="CA (opérateur)" value={form.declaredChiffreAffaires} onChange={(v) => setForm((p) => ({ ...p, declaredChiffreAffaires: v }))} />
                <Field label="Autres produits retenus (portage)" value={form.otherRevenueRetained} onChange={(v) => setForm((p) => ({ ...p, otherRevenueRetained: v }))} />
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Foncier</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prix d'acquisition (€)" value={form.landPrice} onChange={(v) => setForm((p) => ({ ...p, landPrice: v }))} />
                <Field label="Frais de notaire (€)" value={form.notaryFees} onChange={(v) => setForm((p) => ({ ...p, notaryFees: v }))} />
              </div>
              <p className="text-xs text-muted-foreground">
                Total foncier : <span className="font-medium text-foreground">{formatCurrency(liveFoncierTotal)}</span>
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Travaux</h3>
              <CostItemsList items={travauxItems} onChange={setTravauxItems} placeholder="Ex. Gros œuvre" />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Honoraires techniques</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Diagnostics (€)" value={form.diagnosticsCost} onChange={(v) => setForm((p) => ({ ...p, diagnosticsCost: v }))} />
                <Field label="Assurance (€)" value={form.insuranceCost} onChange={(v) => setForm((p) => ({ ...p, insuranceCost: v }))} />
                <Field label="Taxe foncière (€)" value={form.propertyTaxCost} onChange={(v) => setForm((p) => ({ ...p, propertyTaxCost: v }))} />
                <Field label="Géomètre / études (€)" value={form.surveyStudiesCost} onChange={(v) => setForm((p) => ({ ...p, surveyStudiesCost: v }))} />
              </div>
              <CostItemsList items={honorairesItems} onChange={setHonorairesItems} placeholder="Ex. Contrôle technique" />
              <p className="text-xs text-muted-foreground">
                Total honoraires techniques (4 champs + postes) : <span className="font-medium text-foreground">{formatCurrency(liveHonorairesTechniquesTotal)}</span>
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Autres frais</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Honoraires d'agence (€)" value={form.agencyFees} onChange={(v) => setForm((p) => ({ ...p, agencyFees: v }))} />
                <Field label="Apport d'affaires (€)" value={form.referralFees} onChange={(v) => setForm((p) => ({ ...p, referralFees: v }))} />
                <Field label="Frais bancaires divers (€)" value={form.bankMiscFees} onChange={(v) => setForm((p) => ({ ...p, bankMiscFees: v }))} />
              </div>
              <p className="text-xs text-muted-foreground">
                Sous-total (hors financement, calculé) : <span className="font-medium text-foreground">{formatCurrency(liveAutresFraisScalaires)}</span>
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Financement ATLAS</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Taux d'intérêt (%)" value={form.interestRatePct} onChange={(v) => setForm((p) => ({ ...p, interestRatePct: v }))} />
                <Field label="Fees HT (%)" value={form.feesPctHT} onChange={(v) => setForm((p) => ({ ...p, feesPctHT: v }))} />
                <Field label="Durée min (mois)" value={form.durationMinMonths} onChange={(v) => setForm((p) => ({ ...p, durationMinMonths: v }))} />
                <Field label="Durée cible (mois)" value={form.durationTargetMonths} onChange={(v) => setForm((p) => ({ ...p, durationTargetMonths: v }))} />
                <Field label="Durée max (mois)" value={form.durationMaxMonths} onChange={(v) => setForm((p) => ({ ...p, durationMaxMonths: v }))} />
                <Field label="Taux de TVA (%)" value={form.tvaRatePct} onChange={(v) => setForm((p) => ({ ...p, tvaRatePct: v }))} />
              </div>
              <div className="flex items-center gap-2.5">
                <Switch checked={form.tvaApplicable} onCheckedChange={(v) => setForm((p) => ({ ...p, tvaApplicable: v }))} id="tvaApplicable" />
                <Label htmlFor="tvaApplicable" className="cursor-pointer font-normal">
                  TVA applicable sur les fees
                </Label>
              </div>
              <div className="flex items-center gap-2.5">
                <Switch checked={form.hypothequeEnvisagee} onCheckedChange={(v) => setForm((p) => ({ ...p, hypothequeEnvisagee: v }))} id="hypothequeEnvisagee" />
                <Label htmlFor="hypothequeEnvisagee" className="cursor-pointer font-normal">
                  Hypothèque envisagée (estime les frais de garantie, 1,5 % de la collecte)
                </Label>
              </div>
              <div className="flex items-center gap-2.5">
                <Switch checked={form.latePenaltyApplied} onCheckedChange={(v) => setForm((p) => ({ ...p, latePenaltyApplied: v }))} id="latePenaltyApplied" />
                <Label htmlFor="latePenaltyApplied" className="cursor-pointer font-normal">
                  Simuler la pénalité de retard (+5 pts sur le taux)
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Montant décaissé chez le notaire (€)" value={form.montantDecaisseNotaire} onChange={(v) => setForm((p) => ({ ...p, montantDecaisseNotaire: v }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Garanties</Label>
                <Textarea
                  rows={2}
                  placeholder="Ex. Hypothèque de premier rang, caution personnelle..."
                  value={form.guaranteesNote}
                  onChange={(e) => setForm((p) => ({ ...p, guaranteesNote: e.target.value }))}
                />
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Financement bancaire (optionnel)</h3>
              <div className="flex flex-col gap-1.5">
                <Label>Banque</Label>
                <Input placeholder="Laisser vide si aucun financement bancaire" value={form.bankName} onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Crédit acquisition (€)" value={form.bankLoanAcquisition} onChange={(v) => setForm((p) => ({ ...p, bankLoanAcquisition: v }))} />
                <Field label="Crédit accompagnement (€)" value={form.bankLoanAccompagnement} onChange={(v) => setForm((p) => ({ ...p, bankLoanAccompagnement: v }))} />
                <Field label="Taux (%)" value={form.bankInterestRatePct} onChange={(v) => setForm((p) => ({ ...p, bankInterestRatePct: v }))} />
                <Field label="Frais de dossier (€)" value={form.bankFileFees} onChange={(v) => setForm((p) => ({ ...p, bankFileFees: v }))} />
                <Field label="Frais de garantie (€)" value={form.bankGuaranteeFees} onChange={(v) => setForm((p) => ({ ...p, bankGuaranteeFees: v }))} />
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Covenants — ICR / DSCR (optionnel)</h3>
              <p className="text-xs text-muted-foreground">
                Pertinence surtout pour un actif à revenu récurrent ; à évaluer au cas par cas pour du marchand de biens à cycle court, laisser vide sinon.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Résultat opérationnel estimé (€)" value={form.resultatOperationnelEstime} onChange={(v) => setForm((p) => ({ ...p, resultatOperationnelEstime: v }))} />
                <Field
                  label="Flux de trésorerie disponible estimé (€)"
                  value={form.fluxTresorerieDisponibleEstime}
                  onChange={(v) => setForm((p) => ({ ...p, fluxTresorerieDisponibleEstime: v }))}
                />
              </div>
            </section>

            <div>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer et recalculer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {financial?.synthesis && <FinancialSynthesisCard synthesis={financial.synthesis} />}

        {financial && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Indicateurs préqualification</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Metric label="Besoin max. financement" value={financial.besoinMaxFinancement != null ? formatCurrency(financial.besoinMaxFinancement) : '—'} />
              <Metric label="Prix de sortie pondéré /m²" value={financial.prixSortiePondere != null ? formatCurrency(financial.prixSortiePondere) : '—'} />
              <Metric label="Point mort /m²" value={financial.pointMortAuM2 != null ? formatCurrency(financial.pointMortAuM2) : '—'} />
              <Metric label="Marge annoncée" value={pct(financial.declaredMarginPct)} />
              <Metric label="Marge recalculée" value={pct(financial.margeRecalculeePct)} warn={(financial.margeRecalculee ?? 0) < 0} />
            </CardContent>
          </Card>
        )}

        {financial?.covenants && <CovenantsCard covenants={financial.covenants} />}

        {bpComparison && <PrequalBpComparisonCard caseId={caseId} comparison={bpComparison} />}

        {bpComparison?.locked && bpComparison.sensitivity ? (
          <SensitivityComparisonCard initial={bpComparison.sensitivity.initial} current={bpComparison.sensitivity.current} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sensibilité</CardTitle>
            </CardHeader>
            <CardContent>
              {!financial?.sensitivity ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Renseignez le bilan pour calculer la sensibilité.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {financial.sensitivity.map((scenario) => {
                      const tier = marginTier(scenario.marginPct);
                      const style = tier ? MARGIN_TIER_STYLES[tier] : { dot: '⚪', text: 'text-muted-foreground', border: 'border-border', bg: '' };
                      return (
                        <div
                          key={scenario.label}
                          className={cn('flex items-center justify-between rounded-md border p-3', scenario.label === 'Base' ? `${style.border} ${style.bg}` : 'border-border')}
                        >
                          <p className="text-sm font-medium">{scenario.label}</p>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums">{formatCurrency(scenario.margin)}</p>
                            <p className={cn('text-xs font-medium tabular-nums', style.text)}>
                              {style.dot} marge {scenario.marginPct === null ? '—' : `${scenario.marginPct}%`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">🟢 &gt; 30 % · 🟡 20–30 % · 🟠 10–20 % · 🔴 &lt; 10 %</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <DecimalInput value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${warn ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  );
}
