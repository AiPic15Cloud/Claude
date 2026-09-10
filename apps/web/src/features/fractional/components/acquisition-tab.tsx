import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpsertSourcesUses } from '../hooks/use-fractional';
import type { FractionalSourcesUses } from '@/types';

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
  const upsert = useUpsertSourcesUses(projectId);

  useEffect(() => {
    setForm(toFormState(sourcesUses));
  }, [sourcesUses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(FIELDS.map((f) => [f.key, Number(form[f.key]) || 0])) as unknown as Parameters<typeof upsert.mutate>[0];
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
                <Input
                  id={f.key}
                  type="number"
                  step="0.01"
                  min={0}
                  required={f.required}
                  value={form[f.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
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
