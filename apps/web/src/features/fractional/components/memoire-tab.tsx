import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { useCreateProjectActual, useUpsertProjectOutcome, useFractionalPerformanceAttribution, useFractionalComparables } from '../hooks/use-fractional';
import { PROJECT_OUTCOME_STATUS_LABELS, type FractionalProjectActual, type FractionalProjectOutcome, type ProjectOutcomeStatus } from '@/types';

const OUTCOME_STATUSES: ProjectOutcomeStatus[] = ['SUCCES', 'SOUS_PERFORMANCE', 'PERTE', 'REFUSE', 'ABANDONNE'];
const OUTCOME_VARIANT = { SUCCES: 'success', SOUS_PERFORMANCE: 'warning', PERTE: 'destructive', REFUSE: 'destructive', ABANDONNE: 'outline' } as const;

/** Onglet Mémoire (spec V3 §20) — réalisé périodique, résultat final, attribution de performance, dossiers comparables. */
export function MemoireTab({
  projectId,
  actuals,
  outcome,
}: {
  projectId: string;
  actuals: FractionalProjectActual[];
  outcome?: FractionalProjectOutcome | null;
}) {
  const createActual = useCreateProjectActual(projectId);
  const upsertOutcome = useUpsertProjectOutcome(projectId);
  const { data: attribution } = useFractionalPerformanceAttribution(projectId);
  const { data: comparables } = useFractionalComparables(projectId);

  const [actualForm, setActualForm] = useState({ period: String(new Date().getFullYear()), loyersReels: '', opexReel: '', distributionsReelles: '' });
  const [outcomeForm, setOutcomeForm] = useState<{ status: ProjectOutcomeStatus; triRealise: string; multipleRealise: string }>({
    status: outcome?.status ?? 'SUCCES',
    triRealise: outcome?.triRealise ? String(outcome.triRealise) : '',
    multipleRealise: outcome?.multipleRealise ? String(outcome.multipleRealise) : '',
  });

  const handleAddActual = (e: React.FormEvent) => {
    e.preventDefault();
    createActual.mutate(
      {
        period: actualForm.period,
        loyersReels: actualForm.loyersReels ? Number(actualForm.loyersReels) : undefined,
        opexReel: actualForm.opexReel ? Number(actualForm.opexReel) : undefined,
        distributionsReelles: actualForm.distributionsReelles ? Number(actualForm.distributionsReelles) : undefined,
      },
      { onSuccess: () => setActualForm({ ...actualForm, loyersReels: '', opexReel: '', distributionsReelles: '' }) },
    );
  };

  const handleSaveOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    upsertOutcome.mutate({
      status: outcomeForm.status,
      triRealise: outcomeForm.triRealise ? Number(outcomeForm.triRealise) : undefined,
      multipleRealise: outcomeForm.multipleRealise ? Number(outcomeForm.multipleRealise) : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Réalisé périodique</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {actuals.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Loyers réels</TableHead>
                  <TableHead>OPEX réel</TableHead>
                  <TableHead>Distributions réelles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actuals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.period}</TableCell>
                    <TableCell>{a.loyersReels ? formatCurrency(a.loyersReels) : '—'}</TableCell>
                    <TableCell>{a.opexReel ? formatCurrency(a.opexReel) : '—'}</TableCell>
                    <TableCell>{a.distributionsReelles ? formatCurrency(a.distributionsReelles) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <form onSubmit={handleAddActual} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actualPeriod">Période</Label>
              <Input id="actualPeriod" className="w-28" required value={actualForm.period} onChange={(e) => setActualForm((p) => ({ ...p, period: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actualLoyers">Loyers réels</Label>
              <Input id="actualLoyers" type="number" className="w-36" value={actualForm.loyersReels} onChange={(e) => setActualForm((p) => ({ ...p, loyersReels: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actualOpex">OPEX réel</Label>
              <Input id="actualOpex" type="number" className="w-36" value={actualForm.opexReel} onChange={(e) => setActualForm((p) => ({ ...p, opexReel: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actualDist">Distributions réelles</Label>
              <Input id="actualDist" type="number" className="w-40" value={actualForm.distributionsReelles} onChange={(e) => setActualForm((p) => ({ ...p, distributionsReelles: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={createActual.isPending}>
              {createActual.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>

      {attribution && attribution.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attribution de performance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {attribution.map((a) => (
              <p key={a.period} className="text-sm">
                <span className="font-medium">{a.period} — </span>
                {a.summary}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Résultat final</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveOutcome} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Statut</Label>
              <Select value={outcomeForm.status} onValueChange={(v) => setOutcomeForm((p) => ({ ...p, status: v as ProjectOutcomeStatus }))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_OUTCOME_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="triRealise">TRI réalisé (%)</Label>
              <Input id="triRealise" type="number" step="0.1" className="w-32" value={outcomeForm.triRealise} onChange={(e) => setOutcomeForm((p) => ({ ...p, triRealise: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="multipleRealise">Multiple réalisé</Label>
              <Input id="multipleRealise" type="number" step="0.01" className="w-32" value={outcomeForm.multipleRealise} onChange={(e) => setOutcomeForm((p) => ({ ...p, multipleRealise: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={upsertOutcome.isPending}>
              {upsertOutcome.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
            {outcome && <Badge variant={OUTCOME_VARIANT[outcome.status]}>{PROJECT_OUTCOME_STATUS_LABELS[outcome.status]}</Badge>}
          </form>
        </CardContent>
      </Card>

      {comparables && comparables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dossiers comparables</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Rendement brut</TableHead>
                  <TableHead>Similarité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparables.map((c) => (
                  <TableRow key={c.projectId}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.city ?? '—'}</TableCell>
                    <TableCell>{c.prixNetVendeur ? formatCurrency(c.prixNetVendeur) : '—'}</TableCell>
                    <TableCell>{c.grossYieldPct ? `${c.grossYieldPct.toFixed(2)} %` : '—'}</TableCell>
                    <TableCell>{Math.round(c.similarityScore * 100)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
