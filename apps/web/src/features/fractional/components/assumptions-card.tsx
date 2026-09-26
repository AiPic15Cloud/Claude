import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useUpsertAssumptionSet } from '../hooks/use-fractional';
import { parseLocaleNumber } from '@/lib/locale-number';
import type {
  FractionalAssumptionScenario,
  FractionalAssumptionSet,
  LocationTier,
  MarketDepth,
  PropertyConditionTier,
} from '@/types';
import { LOCATION_TIER_LABELS, MARKET_DEPTH_LABELS, PROPERTY_CONDITION_LABELS } from '@/types';

const SCENARIOS: FractionalAssumptionScenario[] = ['BASE', 'BEAR', 'SEVERE', 'CUSTOM'];
const SCENARIO_LABELS: Record<FractionalAssumptionScenario, string> = { BASE: 'Base', BEAR: 'Bear', SEVERE: 'Severe', CUSTOM: 'Custom' };
const PROPERTY_CONDITIONS: PropertyConditionTier[] = ['CORE', 'CORE_PLUS', 'VALUE_ADD', 'OPPORTUNISTE', 'DISTRESSED'];
const LOCATION_TIERS: LocationTier[] = ['PARIS_QCA', 'SECONDAIRE', 'TERTIAIRE_A', 'TERTIAIRE_B', 'TERTIAIRE_C'];
const MARKET_DEPTHS: MarketDepth[] = ['PROFOND', 'MOYEN', 'FAIBLE'];

interface AssumptionFormState {
  scenario: FractionalAssumptionScenario;
  holdPeriodYears: string;
  vacancyCreditLossPct: string;
  opexPct: string;
  rentGrowthPctPerYear: string;
  sellingCostsPct: string;
  materialityThresholdPct: string;
  discountRatePct: string;
  exitValueOverride: string;
  propertyCondition: PropertyConditionTier | '';
  locationTier: LocationTier | '';
  marketDepth: MarketDepth | '';
  tec10PctOverride: string;
}

const DEFAULT_FORM: AssumptionFormState = {
  scenario: 'BASE',
  holdPeriodYears: '5',
  vacancyCreditLossPct: '3',
  opexPct: '15',
  rentGrowthPctPerYear: '1.5',
  sellingCostsPct: '6',
  materialityThresholdPct: '5',
  discountRatePct: '7',
  exitValueOverride: '',
  propertyCondition: '',
  locationTier: '',
  marketDepth: '',
  tec10PctOverride: '',
};

function latestByScenario(sets: FractionalAssumptionSet[]): Partial<Record<FractionalAssumptionScenario, FractionalAssumptionSet>> {
  const result: Partial<Record<FractionalAssumptionScenario, FractionalAssumptionSet>> = {};
  for (const s of sets) {
    const current = result[s.scenario];
    if (!current || s.version > current.version) result[s.scenario] = s;
  }
  return result;
}

/**
 * Éditeur d'AssumptionSet (spec §0/§24, P0-Fondation — jamais exposé côté
 * UI jusqu'ici : sans ça, holdPeriodYears/vacancyCreditLossPct/opexPct
 * n'étaient modifiables qu'en tapant directement sur l'API). Chaque
 * enregistrement crée une nouvelle version (append-only, cf.
 * fractional-projects.service.ts#upsertAssumptionSet) — la plus récente par
 * scénario est celle utilisée par le Returns Engine et les Stress Tests.
 */
export function AssumptionsCard({ projectId, assumptionSets }: { projectId: string; assumptionSets: FractionalAssumptionSet[] }) {
  const [form, setForm] = useState<AssumptionFormState>(DEFAULT_FORM);
  const upsert = useUpsertAssumptionSet(projectId);
  const latest = latestByScenario(assumptionSets);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: Record<string, number> = {
      holdPeriodYears: Number(form.holdPeriodYears),
      vacancyCreditLossPct: parseLocaleNumber(form.vacancyCreditLossPct),
      opexPct: parseLocaleNumber(form.opexPct),
      rentGrowthPctPerYear: parseLocaleNumber(form.rentGrowthPctPerYear),
      sellingCostsPct: parseLocaleNumber(form.sellingCostsPct),
      materialityThresholdPct: parseLocaleNumber(form.materialityThresholdPct),
      discountRatePct: parseLocaleNumber(form.discountRatePct),
    };
    if (form.exitValueOverride) values.exitValueOverride = parseLocaleNumber(form.exitValueOverride);
    if (form.tec10PctOverride) values.tec10PctOverride = parseLocaleNumber(form.tec10PctOverride);
    const withText: Record<string, unknown> = { ...values };
    if (form.propertyCondition) withText.propertyCondition = form.propertyCondition;
    if (form.locationTier) withText.locationTier = form.locationTier;
    if (form.marketDepth) withText.marketDepth = form.marketDepth;
    upsert.mutate({ scenario: form.scenario, values: withText });
  };

  const loadScenario = (scenario: FractionalAssumptionScenario) => {
    const existing = latest[scenario];
    const values = (existing?.values ?? {}) as Record<string, number>;
    setForm({
      scenario,
      holdPeriodYears: String(values.holdPeriodYears ?? DEFAULT_FORM.holdPeriodYears),
      vacancyCreditLossPct: String(values.vacancyCreditLossPct ?? DEFAULT_FORM.vacancyCreditLossPct),
      opexPct: String(values.opexPct ?? DEFAULT_FORM.opexPct),
      rentGrowthPctPerYear: String(values.rentGrowthPctPerYear ?? DEFAULT_FORM.rentGrowthPctPerYear),
      sellingCostsPct: String(values.sellingCostsPct ?? DEFAULT_FORM.sellingCostsPct),
      materialityThresholdPct: String(values.materialityThresholdPct ?? DEFAULT_FORM.materialityThresholdPct),
      discountRatePct: String(values.discountRatePct ?? DEFAULT_FORM.discountRatePct),
      exitValueOverride: values.exitValueOverride !== undefined ? String(values.exitValueOverride) : '',
      propertyCondition: (values as Record<string, unknown>).propertyCondition as PropertyConditionTier | undefined ?? '',
      locationTier: (values as Record<string, unknown>).locationTier as LocationTier | undefined ?? '',
      marketDepth: (values as Record<string, unknown>).marketDepth as MarketDepth | undefined ?? '',
      tec10PctOverride: values.tec10PctOverride !== undefined ? String(values.tec10PctOverride) : '',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Hypothèses (Base / Bear / Severe)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {Object.keys(latest).length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scénario</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Vacance</TableHead>
                <TableHead>OPEX</TableHead>
                <TableHead>Croissance loyers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SCENARIOS.filter((s) => latest[s]).map((s) => {
                const values = (latest[s]!.values ?? {}) as Record<string, number>;
                return (
                  <TableRow key={s} className="cursor-pointer" onClick={() => loadScenario(s)}>
                    <TableCell>
                      <Badge variant="outline">{SCENARIO_LABELS[s]}</Badge>
                    </TableCell>
                    <TableCell>v{latest[s]!.version}</TableCell>
                    <TableCell>{values.holdPeriodYears ?? '—'} ans</TableCell>
                    <TableCell>{values.vacancyCreditLossPct ?? '—'}%</TableCell>
                    <TableCell>{values.opexPct ?? '—'}%</TableCell>
                    <TableCell>{values.rentGrowthPctPerYear ?? '—'}%/an</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Scénario à éditer</Label>
            <Select value={form.scenario} onValueChange={(v) => loadScenario(v as FractionalAssumptionScenario)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIOS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SCENARIO_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="holdPeriodYears">Durée de détention (ans)</Label>
              <Input id="holdPeriodYears" type="number" min={1} value={form.holdPeriodYears} onChange={(e) => setForm((p) => ({ ...p, holdPeriodYears: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vacancyCreditLossPct">Vacance & impayés (%)</Label>
              <DecimalInput id="vacancyCreditLossPct" value={form.vacancyCreditLossPct} onChange={(e) => setForm((p) => ({ ...p, vacancyCreditLossPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opexPct">OPEX (% EGI)</Label>
              <DecimalInput id="opexPct" value={form.opexPct} onChange={(e) => setForm((p) => ({ ...p, opexPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentGrowthPctPerYear">Croissance loyers (%/an)</Label>
              <DecimalInput id="rentGrowthPctPerYear" value={form.rentGrowthPctPerYear} onChange={(e) => setForm((p) => ({ ...p, rentGrowthPctPerYear: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sellingCostsPct">Coûts de vente (%)</Label>
              <DecimalInput id="sellingCostsPct" value={form.sellingCostsPct} onChange={(e) => setForm((p) => ({ ...p, sellingCostsPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="materialityThresholdPct">Seuil de matérialité bail (%)</Label>
              <DecimalInput id="materialityThresholdPct" value={form.materialityThresholdPct} onChange={(e) => setForm((p) => ({ ...p, materialityThresholdPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discountRatePct">Taux d'actualisation DCF (%)</Label>
              <DecimalInput id="discountRatePct" value={form.discountRatePct} onChange={(e) => setForm((p) => ({ ...p, discountRatePct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exitValueOverride">Valeur de sortie (override, optionnel)</Label>
              <DecimalInput id="exitValueOverride" value={form.exitValueOverride} onChange={(e) => setForm((p) => ({ ...p, exitValueOverride: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <div className="text-sm font-medium">Cap Rate Build-Up (Complément H, H.3)</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>État du bien</Label>
                <Select value={form.propertyCondition || undefined} onValueChange={(v) => setForm((p) => ({ ...p, propertyCondition: v as PropertyConditionTier }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Non renseigné" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {PROPERTY_CONDITION_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Localisation</Label>
                <Select value={form.locationTier || undefined} onValueChange={(v) => setForm((p) => ({ ...p, locationTier: v as LocationTier }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Non renseignée" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TIERS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {LOCATION_TIER_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Profondeur de marché</Label>
                <Select value={form.marketDepth || undefined} onValueChange={(v) => setForm((p) => ({ ...p, marketDepth: v as MarketDepth }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Non renseignée" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKET_DEPTHS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MARKET_DEPTH_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tec10PctOverride">TEC10 (override %, optionnel)</Label>
                <DecimalInput
                  id="tec10PctOverride"
                  value={form.tec10PctOverride}
                  onChange={(e) => setForm((p) => ({ ...p, tec10PctOverride: e.target.value }))}
                  placeholder="Taux live"
                />
              </div>
            </div>
          </div>
          <div>
            <Button type="submit" size="sm" disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer ce scénario
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
