import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useUpsertAssumptionSet } from '../hooks/use-fractional';
import type { FractionalAssumptionScenario, FractionalAssumptionSet } from '@/types';

const SCENARIOS: FractionalAssumptionScenario[] = ['BASE', 'BEAR', 'SEVERE', 'CUSTOM'];
const SCENARIO_LABELS: Record<FractionalAssumptionScenario, string> = { BASE: 'Base', BEAR: 'Bear', SEVERE: 'Severe', CUSTOM: 'Custom' };

interface AssumptionFormState {
  scenario: FractionalAssumptionScenario;
  holdPeriodYears: string;
  vacancyCreditLossPct: string;
  opexPct: string;
  rentGrowthPctPerYear: string;
  sellingCostsPct: string;
  materialityThresholdPct: string;
  exitValueOverride: string;
}

const DEFAULT_FORM: AssumptionFormState = {
  scenario: 'BASE',
  holdPeriodYears: '5',
  vacancyCreditLossPct: '3',
  opexPct: '15',
  rentGrowthPctPerYear: '1.5',
  sellingCostsPct: '6',
  materialityThresholdPct: '5',
  exitValueOverride: '',
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
      vacancyCreditLossPct: Number(form.vacancyCreditLossPct),
      opexPct: Number(form.opexPct),
      rentGrowthPctPerYear: Number(form.rentGrowthPctPerYear),
      sellingCostsPct: Number(form.sellingCostsPct),
      materialityThresholdPct: Number(form.materialityThresholdPct),
    };
    if (form.exitValueOverride) values.exitValueOverride = Number(form.exitValueOverride);
    upsert.mutate({ scenario: form.scenario, values });
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
      exitValueOverride: values.exitValueOverride !== undefined ? String(values.exitValueOverride) : '',
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
              <Input id="vacancyCreditLossPct" type="number" step="0.1" value={form.vacancyCreditLossPct} onChange={(e) => setForm((p) => ({ ...p, vacancyCreditLossPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opexPct">OPEX (% EGI)</Label>
              <Input id="opexPct" type="number" step="0.1" value={form.opexPct} onChange={(e) => setForm((p) => ({ ...p, opexPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentGrowthPctPerYear">Croissance loyers (%/an)</Label>
              <Input id="rentGrowthPctPerYear" type="number" step="0.1" value={form.rentGrowthPctPerYear} onChange={(e) => setForm((p) => ({ ...p, rentGrowthPctPerYear: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sellingCostsPct">Coûts de vente (%)</Label>
              <Input id="sellingCostsPct" type="number" step="0.1" value={form.sellingCostsPct} onChange={(e) => setForm((p) => ({ ...p, sellingCostsPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="materialityThresholdPct">Seuil de matérialité bail (%)</Label>
              <Input id="materialityThresholdPct" type="number" step="0.1" value={form.materialityThresholdPct} onChange={(e) => setForm((p) => ({ ...p, materialityThresholdPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exitValueOverride">Valeur de sortie (override, optionnel)</Label>
              <Input id="exitValueOverride" type="number" min={0} value={form.exitValueOverride} onChange={(e) => setForm((p) => ({ ...p, exitValueOverride: e.target.value }))} />
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
