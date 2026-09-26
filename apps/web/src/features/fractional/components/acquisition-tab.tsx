import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpsertSourcesUses } from '../hooks/use-fractional';
import { parseLocaleNumber } from '@/lib/locale-number';
import { TVA_REGIME_LABELS, type FractionalSourcesUses, type TvaRegime } from '@/types';

const TVA_REGIMES: TvaRegime[] = ['NON_ASSUJETTI', 'MARGE', 'PRIX_TOTAL_OPTION_LOYERS'];

const FIELDS: { key: keyof FormState; label: string; required?: boolean }[] = [
  { key: 'prixNetVendeur', label: 'Prix net vendeur', required: true },
  { key: 'droitsNotaire', label: 'Droits / notaire' },
  { key: 'honoraires', label: 'Honoraires' },
  { key: 'travauxInitiaux', label: 'Travaux initiaux' },
  { key: 'capexDiffereReserve', label: 'CAPEX différé (réserve)' },
  { key: 'fraisPlateformeEntree', label: "Frais plateforme d'entrée" },
  { key: 'reserveVacance', label: 'Réserve vacance' },
  { key: 'reserveTravaux', label: 'Réserve travaux' },
  { key: 'reserveTresorerie', label: 'Réserve trésorerie' },
  { key: 'collecteMontant', label: 'Collecte (capital investisseurs)' },
  { key: 'sponsorEquity', label: 'Sponsor equity' },
  { key: 'detteEventuelle', label: 'Dette éventuelle' },
  { key: 'autresSources', label: 'Autres sources' },
];

type FormState = Record<
  | 'prixNetVendeur'
  | 'droitsNotaire'
  | 'honoraires'
  | 'travauxInitiaux'
  | 'capexDiffereReserve'
  | 'fraisPlateformeEntree'
  | 'reserveVacance'
  | 'reserveTravaux'
  | 'reserveTresorerie'
  | 'collecteMontant'
  | 'sponsorEquity'
  | 'detteEventuelle'
  | 'autresSources',
  string
>;

function toFormState(sourcesUses?: FractionalSourcesUses | null): FormState {
  const empty = Object.fromEntries(FIELDS.map((f) => [f.key, '0'])) as FormState;
  if (!sourcesUses) return { ...empty, prixNetVendeur: '' };
  return Object.fromEntries(FIELDS.map((f) => [f.key, String(sourcesUses[f.key as keyof FractionalSourcesUses] ?? 0)])) as FormState;
}

/** Onglet Acquisition (spec V3 §5) — Sources & Uses ; le contrôle Sources = Uses s'affiche dans l'onglet Synthèse une fois calculé. */
export function AcquisitionTab({ projectId, sourcesUses }: { projectId: string; sourcesUses?: FractionalSourcesUses | null }) {
  const [form, setForm] = useState<FormState>(() => toFormState(sourcesUses));
  const [regimeTva, setRegimeTva] = useState<TvaRegime>(sourcesUses?.regimeTva ?? 'NON_ASSUJETTI');
  const [tvaTauxPct, setTvaTauxPct] = useState(sourcesUses?.tvaTauxPct !== null && sourcesUses?.tvaTauxPct !== undefined ? String(sourcesUses.tvaTauxPct) : '20');
  const [tvaRecuperationDelaiMois, setTvaRecuperationDelaiMois] = useState(
    sourcesUses?.tvaRecuperationDelaiMois !== null && sourcesUses?.tvaRecuperationDelaiMois !== undefined ? String(sourcesUses.tvaRecuperationDelaiMois) : '3',
  );
  const upsert = useUpsertSourcesUses(projectId);

  useEffect(() => {
    setForm(toFormState(sourcesUses));
    setRegimeTva(sourcesUses?.regimeTva ?? 'NON_ASSUJETTI');
    if (sourcesUses?.tvaTauxPct !== null && sourcesUses?.tvaTauxPct !== undefined) setTvaTauxPct(String(sourcesUses.tvaTauxPct));
    if (sourcesUses?.tvaRecuperationDelaiMois !== null && sourcesUses?.tvaRecuperationDelaiMois !== undefined) setTvaRecuperationDelaiMois(String(sourcesUses.tvaRecuperationDelaiMois));
  }, [sourcesUses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(FIELDS.map((f) => [f.key, parseLocaleNumber(form[f.key]) || 0])) as unknown as Parameters<typeof upsert.mutate>[0];
    payload.regimeTva = regimeTva;
    if (regimeTva === 'PRIX_TOTAL_OPTION_LOYERS') {
      payload.tvaTauxPct = parseLocaleNumber(tvaTauxPct) || 20;
      payload.tvaRecuperationDelaiMois = Number(tvaRecuperationDelaiMois) || 3;
    }
    upsert.mutate(payload);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sources & Uses</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <DecimalInput
                  id={f.key}
                  required={f.required}
                  value={form[f.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <div className="text-sm font-medium">Régime de TVA (Complément H, H.3)</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="regimeTva">Régime</Label>
                <Select value={regimeTva} onValueChange={(v) => setRegimeTva(v as TvaRegime)}>
                  <SelectTrigger id="regimeTva">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TVA_REGIMES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {TVA_REGIME_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {regimeTva === 'PRIX_TOTAL_OPTION_LOYERS' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tvaTauxPct">Taux de TVA (%)</Label>
                    <DecimalInput
                      id="tvaTauxPct"
                      value={tvaTauxPct}
                      onChange={(e) => setTvaTauxPct(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tvaRecuperationDelaiMois">Délai de récupération (mois)</Label>
                    <Input
                      id="tvaRecuperationDelaiMois"
                      type="number"
                      step="1"
                      min={0}
                      value={tvaRecuperationDelaiMois}
                      onChange={(e) => setTvaRecuperationDelaiMois(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          <div>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
