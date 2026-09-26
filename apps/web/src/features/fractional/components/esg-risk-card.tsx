import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { parseLocaleNumber } from '@/lib/locale-number';
import { useFractionalEsgRiskProfile, useUpsertEsgAssessment } from '../hooks/use-fractional';
import { DPE_CLASS_VALUES, ESG_EQUIPMENT_TIER_LABELS, ESG_PHYSICAL_RISK_TIER_LABELS, type DpeClass, type EsgEquipmentTier, type EsgPhysicalRiskTier } from '@/types';

const EQUIPMENT_TIERS: EsgEquipmentTier[] = ['NEUF', 'BON', 'VETUSTE', 'OBSOLETE'];
const PHYSICAL_RISK_TIERS: EsgPhysicalRiskTier[] = ['FAIBLE', 'MODERE', 'ELEVE'];

const NONE_VALUE = '__none__';

function pts(value: number): string {
  return `${value.toFixed(2).replace(/\.?0+$/, '')} pt${Math.abs(value) >= 2 ? 's' : ''}`;
}

/**
 * ESG, Energy & Obsolescence Risk Engine (spec V3.1 §12) — traduit l'évaluation
 * ESG en impact économique (CAPEX to comply/compete, prime de risque de
 * décote sur le cap rate) plutôt qu'un score décoratif. Chaque ligne reste
 * nommée et visible (jamais un score composite opaque).
 */
export function EsgRiskCard({ projectId }: { projectId: string }) {
  const { data, isLoading } = useFractionalEsgRiskProfile(projectId);
  const upsert = useUpsertEsgAssessment(projectId);

  const [form, setForm] = useState({
    dpeClass: '' as DpeClass | '',
    consumptionKwhM2An: '',
    decreeTertiaireSubject: false,
    equipmentConditionTier: '' as EsgEquipmentTier | '',
    physicalRiskExposure: '' as EsgPhysicalRiskTier | '',
    greenLeaseClauses: false,
    notes: '',
  });

  useEffect(() => {
    if (!data?.assessment) return;
    const a = data.assessment;
    setForm({
      dpeClass: a.dpeClass ?? '',
      consumptionKwhM2An: a.consumptionKwhM2An !== null ? String(a.consumptionKwhM2An) : '',
      decreeTertiaireSubject: a.decreeTertiaireSubject,
      equipmentConditionTier: a.equipmentConditionTier ?? '',
      physicalRiskExposure: a.physicalRiskExposure ?? '',
      greenLeaseClauses: a.greenLeaseClauses,
      notes: a.notes ?? '',
    });
  }, [data?.assessment]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ESG, énergie & obsolescence (spec V3.1 §12)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;
  const { profile, surfaceM2 } = data;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate({
      dpeClass: form.dpeClass || undefined,
      consumptionKwhM2An: form.consumptionKwhM2An ? parseLocaleNumber(form.consumptionKwhM2An) : undefined,
      decreeTertiaireSubject: form.decreeTertiaireSubject,
      equipmentConditionTier: form.equipmentConditionTier || undefined,
      physicalRiskExposure: form.physicalRiskExposure || undefined,
      greenLeaseClauses: form.greenLeaseClauses,
      notes: form.notes || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ESG, énergie & obsolescence (spec V3.1 §12)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Traduit l'évaluation ESG en impact chiffré — CAPEX to comply / CAPEX to compete et prime de risque de décote sur le cap rate — plutôt qu'un score
          décoratif. Une dimension non évaluée est traitée au pire cas pour la prime de risque, jamais comme "sans risque".
        </p>

        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Classe DPE</Label>
            <Select
              value={form.dpeClass || NONE_VALUE}
              onValueChange={(v) => {
                // Radix appelle onValueChange('') de façon parasite depuis son <select> caché
                // de bubbling natif lorsque la valeur contrôlée change vers un item jamais
                // encore monté dans le popover (ex. hydratation depuis une valeur chargée de
                // façon asynchrone) — ignorer, ce n'est jamais une sélection réelle de
                // l'utilisateur (aucune de nos valeurs n'est une chaîne vide).
                if (!v) return;
                setForm((p) => ({ ...p, dpeClass: v === NONE_VALUE ? '' : (v as DpeClass) }));
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Non évaluée">{form.dpeClass || undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Non évaluée</SelectItem>
                {DPE_CLASS_VALUES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="esgConsumption">Consommation (kWh/m²/an)</Label>
            <DecimalInput
              id="esgConsumption"
              className="w-40"
              value={form.consumptionKwhM2An}
              onChange={(e) => setForm((p) => ({ ...p, consumptionKwhM2An: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 pb-1.5">
            <Switch checked={form.decreeTertiaireSubject} onCheckedChange={(v) => setForm((p) => ({ ...p, decreeTertiaireSubject: v }))} id="decreeTertiaire" />
            <Label htmlFor="decreeTertiaire">Assujetti décret tertiaire</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>État des équipements</Label>
            <Select
              value={form.equipmentConditionTier || NONE_VALUE}
              onValueChange={(v) => {
                if (!v) return;
                setForm((p) => ({ ...p, equipmentConditionTier: v === NONE_VALUE ? '' : (v as EsgEquipmentTier) }));
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Non évalué">{form.equipmentConditionTier ? ESG_EQUIPMENT_TIER_LABELS[form.equipmentConditionTier] : undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Non évalué</SelectItem>
                {EQUIPMENT_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ESG_EQUIPMENT_TIER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Risques physiques</Label>
            <Select
              value={form.physicalRiskExposure || NONE_VALUE}
              onValueChange={(v) => {
                if (!v) return;
                setForm((p) => ({ ...p, physicalRiskExposure: v === NONE_VALUE ? '' : (v as EsgPhysicalRiskTier) }));
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Non évalués">{form.physicalRiskExposure ? ESG_PHYSICAL_RISK_TIER_LABELS[form.physicalRiskExposure] : undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Non évalués</SelectItem>
                {PHYSICAL_RISK_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ESG_PHYSICAL_RISK_TIER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-1.5">
            <Switch checked={form.greenLeaseClauses} onCheckedChange={(v) => setForm((p) => ({ ...p, greenLeaseClauses: v }))} id="greenLease" />
            <Label htmlFor="greenLease">Clauses green lease</Label>
          </div>
          <Button type="submit" size="sm" disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>

        <Textarea placeholder="Notes (optionnel)" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">CAPEX estimé</p>
            {!profile.dpeClassKnown ? (
              <p className="text-sm text-muted-foreground">Classe DPE non renseignée — CAPEX non estimable.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>CAPEX to comply (décret tertiaire)</span>
                  <span className="font-medium tabular-nums">
                    {profile.capexToComplyTotal !== null ? formatCurrency(profile.capexToComplyTotal) : `${profile.capexToComplyPerM2} €/m² (surface inconnue)`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>CAPEX to compete (classe B)</span>
                  <span className="font-medium tabular-nums">
                    {profile.capexToCompeteTotal !== null ? formatCurrency(profile.capexToCompeteTotal) : `${profile.capexToCompetePerM2} €/m² (surface inconnue)`}
                  </span>
                </div>
                {surfaceM2 === null && <p className="text-xs text-muted-foreground">Surface totale non renseignée (baux sans surface) — montants totaux non calculables.</p>}
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Prime de risque sur le cap rate</p>
            <div className="flex items-center justify-between text-sm">
              <span>Décote de risque (stranded asset)</span>
              <span className="font-medium tabular-nums">{pts(profile.strandedAssetPremiumPct)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Obsolescence équipements</span>
              <span className="font-medium tabular-nums">{pts(profile.equipmentObsolescencePremiumPct)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Risques physiques</span>
              <span className="font-medium tabular-nums">{pts(profile.physicalRiskPremiumPct)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>Impact total sur la valorisation</span>
              <Badge variant={profile.totalValuationImpactPts >= 1.5 ? 'destructive' : profile.totalValuationImpactPts > 0 ? 'warning' : 'success'}>
                +{pts(profile.totalValuationImpactPts)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
