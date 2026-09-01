import { useState } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useComputeScenarios } from '../hooks/use-financial-model';
import { formatCurrency } from '@/lib/format';
import type { ScenarioAxisVariable, ScenarioDeltas, ScenarioResult } from '@/types';

const AXIS_LABELS: Record<ScenarioAxisVariable, string> = {
  tauxDeltaPts: "Taux d'intérêt (pts)",
  dureeDeltaMonths: 'Durée (mois)',
  prixSortiePctDelta: 'Prix de sortie (%)',
  travauxPctDelta: 'Travaux (%)',
  delaiCommercialisationMonths: 'Délai de commercialisation (mois)',
};

const AXIS_DEFAULT_STEPS: Record<ScenarioAxisVariable, number[]> = {
  tauxDeltaPts: [-1, -0.5, 0, 0.5, 1],
  dureeDeltaMonths: [-2, -1, 0, 1, 2],
  prixSortiePctDelta: [-10, -5, 0, 5, 10],
  travauxPctDelta: [-10, -5, 0, 5, 10],
  delaiCommercialisationMonths: [0, 1, 2, 3, 4],
};

function formatPct(value: number | null): string {
  return value !== null ? `${value.toFixed(1)}%` : '—';
}

function formatMultiple(value: number | null): string {
  return value !== null ? `${value.toFixed(2)}x` : '—';
}

function ScenarioCard({ result }: { result: ScenarioResult }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium">{result.label}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">TRI annualisé</span>
        <span className="text-right font-mono tabular-nums font-semibold">{formatPct(result.triAnnuelPct)}</span>
        <span className="text-muted-foreground">Multiple de capital</span>
        <span className="text-right font-mono tabular-nums">{formatMultiple(result.multipleCapital)}</span>
        <span className="text-muted-foreground">Marge</span>
        <span className="text-right font-mono tabular-nums">
          {formatCurrency(result.marge)} ({formatPct(result.margePct)})
        </span>
        <span className="text-muted-foreground">Point mort</span>
        <span className="text-right font-mono tabular-nums">{formatCurrency(result.pointMortTotal)}</span>
        <span className="text-muted-foreground">Durée effective</span>
        <span className="text-right font-mono tabular-nums">{result.dureeEffectiveMonths} mois</span>
      </div>
    </div>
  );
}

const EMPTY_DELTAS: Required<ScenarioDeltas> = {
  tauxDeltaPts: 0,
  dureeDeltaMonths: 0,
  prixSortiePctDelta: 0,
  travauxPctDelta: 0,
  delaiCommercialisationMonths: 0,
};

/**
 * D.1 — sensibilité de scénario (module d'entraînement analyste
 * investissement). TRI/multiple = vision PROJET (coût de revient → prix de
 * vente), pas rendement du prêt LPB — cf. scenario-sensitivity.util.ts côté
 * API pour la justification. Formation, pas un outil de décision réglementé
 * (même doctrine que le Risque ATLAS — cf. DISCLAIMER risk-engine).
 */
export function ScenarioSensitivitySheet({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<Required<ScenarioDeltas>>(EMPTY_DELTAS);
  const [rowVariable, setRowVariable] = useState<ScenarioAxisVariable>('prixSortiePctDelta');
  const [colVariable, setColVariable] = useState<ScenarioAxisVariable>('delaiCommercialisationMonths');
  const compute = useComputeScenarios(dealId);
  const result = compute.data;

  const handleOpen = () => {
    setOpen(true);
    if (!compute.data) compute.mutate({});
  };

  const handleRecomputeCustom = () => {
    compute.mutate({
      custom,
      matrixRowVariable: rowVariable,
      matrixRowValues: AXIS_DEFAULT_STEPS[rowVariable],
      matrixColVariable: colVariable,
      matrixColValues: AXIS_DEFAULT_STEPS[colVariable],
    });
  };

  const updateCustom = (key: ScenarioAxisVariable, raw: string) => {
    const value = raw === '' ? 0 : Number(raw);
    setCustom((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : 0 }));
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={handleOpen}>
        <Calculator className="h-3.5 w-3.5" /> Scénarios
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Sensibilité de scénario</SheetTitle>
            <SheetDescription>
              Fait varier les hypothèses du dossier pour observer l'impact sur le TRI, le multiple de capital et la marge — module
              d'entraînement, pas un avis d'investissement (cf. avertissement du Risque ATLAS).
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-5">
            {compute.isPending && !result && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {compute.isError && <p className="text-xs text-destructive">Calcul indisponible pour le moment.</p>}

            {result && !result.hasData && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucune hypothèse financière saisie pour ce dossier — renseignez le modèle financier avant de calculer un scénario.
              </p>
            )}

            {result?.hasData && (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {result.pessimiste && <ScenarioCard result={result.pessimiste} />}
                  {result.central && <ScenarioCard result={result.central} />}
                  {result.optimiste && <ScenarioCard result={result.optimiste} />}
                </div>

                <div className="rounded-md border border-border p-3">
                  <p className="mb-3 text-sm font-medium">Scénario personnalisé</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(Object.keys(AXIS_LABELS) as ScenarioAxisVariable[]).map((key) => (
                      <div key={key} className="flex flex-col gap-1">
                        <Label htmlFor={`scenario-${key}`} className="text-[11px] text-muted-foreground">
                          {AXIS_LABELS[key]}
                        </Label>
                        <Input
                          id={`scenario-${key}`}
                          type="number"
                          step="0.1"
                          value={custom[key]}
                          onChange={(e) => updateCustom(key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:min-w-0 sm:flex-none">
                      <Label className="text-[11px] text-muted-foreground">Matrice — ligne</Label>
                      <Select value={rowVariable} onValueChange={(v) => setRowVariable(v as ScenarioAxisVariable)}>
                        <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(AXIS_LABELS) as ScenarioAxisVariable[]).map((key) => (
                            <SelectItem key={key} value={key}>{AXIS_LABELS[key]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:min-w-0 sm:flex-none">
                      <Label className="text-[11px] text-muted-foreground">Matrice — colonne</Label>
                      <Select value={colVariable} onValueChange={(v) => setColVariable(v as ScenarioAxisVariable)}>
                        <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(AXIS_LABELS) as ScenarioAxisVariable[]).map((key) => (
                            <SelectItem key={key} value={key}>{AXIS_LABELS[key]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" onClick={handleRecomputeCustom} disabled={compute.isPending}>
                      {compute.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
                      Recalculer
                    </Button>
                  </div>
                </div>

                {result.custom && (
                  <div className="sm:w-1/3">
                    <ScenarioCard result={result.custom} />
                  </div>
                )}

                {result.matrix && (
                  <div className="overflow-x-auto">
                    <p className="mb-2 text-xs text-muted-foreground">
                      TRI annualisé — {AXIS_LABELS[result.matrix.rowVariable]} (lignes) × {AXIS_LABELS[result.matrix.colVariable]} (colonnes)
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead />
                          {result.matrix.colValues.map((colValue) => (
                            <TableHead key={colValue} className="text-right">{colValue}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.matrix.rowValues.map((rowValue, rowIndex) => (
                          <TableRow key={rowValue}>
                            <TableCell className="font-medium">{rowValue}</TableCell>
                            {result.matrix!.cells[rowIndex].map((cell, colIndex) => (
                              <TableCell key={colIndex} className="text-right font-mono tabular-nums">
                                {formatPct(cell.triAnnuelPct)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            <p className="border-t border-border pt-3 text-[11px] leading-snug text-muted-foreground">
              TRI et multiple mesurent le rendement du projet dans son ensemble (coût de revient total → prix de vente à la sortie),
              pas le rendement du financement LPB seul. Scénarios Pessimiste/Optimiste : hypothèses illustratives fixes — utilisez le
              scénario personnalisé pour vos propres hypothèses.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
