import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import {
  useRentIndexSeries,
  useUpsertRentIndexSeries,
  useDeleteRentIndexSeries,
  useMarketComparables,
  useCreateMarketComparable,
  useDeleteMarketComparable,
} from '../hooks/use-fractional';
import { RENT_INDEX_TYPE_LABELS, MARKET_COMPARABLE_TYPE_LABELS, type RentIndexType, type MarketComparableType } from '@/types';

const INDEX_TYPES: RentIndexType[] = ['ILC', 'ILAT', 'IRL', 'ICC'];
const COMPARABLE_TYPES: MarketComparableType[] = ['LOYER', 'VENTE'];

const DEFAULT_INDEX_FORM = { indexType: 'ILC' as RentIndexType, period: '', value: '', cagr5y: '', cagr10y: '', asOfDate: '', source: '' };
const DEFAULT_COMPARABLE_FORM = { commune: '', secteur: '', type: 'LOYER' as MarketComparableType, valeurM2: '', yieldPct: '', surfaceM2: '', asOfDate: '', source: '', notes: '' };

/**
 * Onglet Marché (patch V3.2 §2) — RentIndexSeries et MarketComparablePool
 * sont des données partagées au niveau organisation, jamais dupliquées par
 * dossier : cet onglet lit/écrit le même pool quel que soit le projet
 * Fractionné depuis lequel on l'ouvre. Un comparable ajouté ici depuis un
 * dossier est tagué addedByProjectId pour tracer son origine, mais rejoint
 * le pool géographique commun.
 */
export function MarcheTab({ projectId }: { projectId: string }) {
  const { data: series, isLoading: seriesLoading } = useRentIndexSeries();
  const upsertSeries = useUpsertRentIndexSeries();
  const deleteSeries = useDeleteRentIndexSeries();

  const { data: comparables, isLoading: comparablesLoading } = useMarketComparables();
  const createComparable = useCreateMarketComparable();
  const deleteComparable = useDeleteMarketComparable();

  const [indexForm, setIndexForm] = useState(DEFAULT_INDEX_FORM);
  const [comparableForm, setComparableForm] = useState(DEFAULT_COMPARABLE_FORM);

  const handleAddIndex = (e: React.FormEvent) => {
    e.preventDefault();
    upsertSeries.mutate(
      {
        indexType: indexForm.indexType,
        period: indexForm.period,
        value: Number(indexForm.value),
        cagr5y: indexForm.cagr5y ? Number(indexForm.cagr5y) : undefined,
        cagr10y: indexForm.cagr10y ? Number(indexForm.cagr10y) : undefined,
        asOfDate: indexForm.asOfDate,
        source: indexForm.source || undefined,
      },
      { onSuccess: () => setIndexForm({ ...DEFAULT_INDEX_FORM, indexType: indexForm.indexType }) },
    );
  };

  const handleAddComparable = (e: React.FormEvent) => {
    e.preventDefault();
    createComparable.mutate(
      {
        commune: comparableForm.commune,
        secteur: comparableForm.secteur || undefined,
        type: comparableForm.type,
        valeurM2: comparableForm.valeurM2 ? Number(comparableForm.valeurM2) : undefined,
        yieldPct: comparableForm.yieldPct ? Number(comparableForm.yieldPct) : undefined,
        surfaceM2: comparableForm.surfaceM2 ? Number(comparableForm.surfaceM2) : undefined,
        asOfDate: comparableForm.asOfDate,
        source: comparableForm.source,
        notes: comparableForm.notes || undefined,
        addedByProjectId: projectId,
      },
      { onSuccess: () => setComparableForm(DEFAULT_COMPARABLE_FORM) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Indices de référence (ILC / ILAT / IRL / ICC)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {seriesLoading && <Skeleton className="h-32" />}
          {series && series.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indice</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>CAGR 5 ans</TableHead>
                  <TableHead>CAGR 10 ans</TableHead>
                  <TableHead>Au</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{RENT_INDEX_TYPE_LABELS[s.indexType]}</TableCell>
                    <TableCell>{s.period}</TableCell>
                    <TableCell>{s.value}</TableCell>
                    <TableCell>{s.cagr5y !== null ? `${s.cagr5y}%` : '—'}</TableCell>
                    <TableCell>{s.cagr10y !== null ? `${s.cagr10y}%` : '—'}</TableCell>
                    <TableCell>{formatDate(s.asOfDate)}</TableCell>
                    <TableCell>{s.source ?? '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteSeries.mutate(s.id)} disabled={deleteSeries.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <form onSubmit={handleAddIndex} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Indice</Label>
              <Select value={indexForm.indexType} onValueChange={(v) => setIndexForm((p) => ({ ...p, indexType: v as RentIndexType }))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDEX_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {RENT_INDEX_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="indexPeriod">Période</Label>
              <Input id="indexPeriod" required placeholder="2026-T2" className="w-28" value={indexForm.period} onChange={(e) => setIndexForm((p) => ({ ...p, period: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="indexValue">Valeur</Label>
              <Input id="indexValue" type="number" step="0.0001" required className="w-28" value={indexForm.value} onChange={(e) => setIndexForm((p) => ({ ...p, value: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="indexCagr5">CAGR 5 ans (%)</Label>
              <Input id="indexCagr5" type="number" step="0.001" className="w-24" value={indexForm.cagr5y} onChange={(e) => setIndexForm((p) => ({ ...p, cagr5y: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="indexCagr10">CAGR 10 ans (%)</Label>
              <Input id="indexCagr10" type="number" step="0.001" className="w-24" value={indexForm.cagr10y} onChange={(e) => setIndexForm((p) => ({ ...p, cagr10y: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="indexAsOfDate">Au</Label>
              <Input id="indexAsOfDate" type="date" required className="w-40" value={indexForm.asOfDate} onChange={(e) => setIndexForm((p) => ({ ...p, asOfDate: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="indexSource">Source</Label>
              <Input id="indexSource" placeholder="INSEE" className="w-32" value={indexForm.source} onChange={(e) => setIndexForm((p) => ({ ...p, source: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={upsertSeries.isPending}>
              {upsertSeries.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter / mettre à jour
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comparables marché</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {comparablesLoading && <Skeleton className="h-32" />}
          {comparables && comparables.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commune</TableHead>
                    <TableHead>Secteur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Valeur/m²</TableHead>
                    <TableHead>Yield</TableHead>
                    <TableHead>Surface</TableHead>
                    <TableHead>Au</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparables.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.commune}</TableCell>
                      <TableCell>{c.secteur ?? '—'}</TableCell>
                      <TableCell>{MARKET_COMPARABLE_TYPE_LABELS[c.type]}</TableCell>
                      <TableCell>{c.valeurM2 !== null ? `${c.valeurM2} €/m²` : '—'}</TableCell>
                      <TableCell>{c.yieldPct !== null ? `${c.yieldPct}%` : '—'}</TableCell>
                      <TableCell>{c.surfaceM2 !== null ? `${c.surfaceM2} m²` : '—'}</TableCell>
                      <TableCell>{formatDate(c.asOfDate)}</TableCell>
                      <TableCell>{c.source}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteComparable.mutate(c.id)} disabled={deleteComparable.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <form onSubmit={handleAddComparable} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compCommune">Commune</Label>
              <Input id="compCommune" required className="w-36" value={comparableForm.commune} onChange={(e) => setComparableForm((p) => ({ ...p, commune: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compSecteur">Secteur</Label>
              <Input id="compSecteur" className="w-32" value={comparableForm.secteur} onChange={(e) => setComparableForm((p) => ({ ...p, secteur: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={comparableForm.type} onValueChange={(v) => setComparableForm((p) => ({ ...p, type: v as MarketComparableType }))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPARABLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MARKET_COMPARABLE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compValeurM2">Valeur/m² (€)</Label>
              <Input id="compValeurM2" type="number" step="0.01" className="w-28" value={comparableForm.valeurM2} onChange={(e) => setComparableForm((p) => ({ ...p, valeurM2: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compYield">Yield (%)</Label>
              <Input id="compYield" type="number" step="0.01" className="w-24" value={comparableForm.yieldPct} onChange={(e) => setComparableForm((p) => ({ ...p, yieldPct: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compSurface">Surface (m²)</Label>
              <Input id="compSurface" type="number" step="0.01" className="w-28" value={comparableForm.surfaceM2} onChange={(e) => setComparableForm((p) => ({ ...p, surfaceM2: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compAsOfDate">Au</Label>
              <Input id="compAsOfDate" type="date" required className="w-40" value={comparableForm.asOfDate} onChange={(e) => setComparableForm((p) => ({ ...p, asOfDate: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compSource">Source</Label>
              <Input id="compSource" required placeholder="DVF, annonce..." className="w-36" value={comparableForm.source} onChange={(e) => setComparableForm((p) => ({ ...p, source: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={createComparable.isPending}>
              {createComparable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
