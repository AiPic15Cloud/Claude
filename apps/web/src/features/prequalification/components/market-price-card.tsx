import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Bar, ComposedChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { usePrequalMarketPrice } from '../hooks/use-prequalification';
import type { MarketPriceTypology } from '@/features/dossiers/hooks/use-market-price';

const TYPOLOGY_LABELS: Record<MarketPriceTypology, string> = {
  MAISON: 'Maison',
  APPARTEMENT: 'Appartement',
  TERRAIN_A_BATIR: 'Terrain à bâtir',
};

function formatPricePerSqm(value: number | null): string {
  return value !== null ? `${formatCurrency(value)}/m²` : '—';
}

/**
 * Recherche de prix au m² à la demande (spec ATLAS v2, C.8) appliquée à un
 * dossier de préqualification — même moteur (MarketPriceService) et même
 * présentation que l'onglet Marché des Deals (market-price-sheet.tsx),
 * jamais un second composant de scraping parallèle.
 */
export function MarketPriceCard({ caseId }: { caseId: string }) {
  const [typology, setTypology] = useState<MarketPriceTypology | ''>('');
  const search = usePrequalMarketPrice(caseId);
  const result = search.data;
  const exitPricePerSqm = result?.exitPricePerSqm ?? null;

  const handleSearch = () => {
    if (!typology) return;
    search.mutate(typology);
  };

  const respondedCount = result?.sources.filter((s) => s.available).length ?? 0;
  const totalCount = result?.sources.length ?? 0;

  const chartData =
    result?.sources.map((s) => ({
      name: s.source,
      priceLow: s.priceLow,
      priceMid: s.priceMid,
      priceHigh: s.priceHigh,
    })) ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Prix du marché au m²</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Select value={typology} onValueChange={(v) => setTypology(v as MarketPriceTypology)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Typologie de l'actif…" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPOLOGY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSearch} disabled={!typology || search.isPending}>
            {search.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Rechercher
          </Button>
        </div>

        {search.isError && <p className="text-xs text-destructive">Recherche indisponible pour le moment.</p>}

        {result && (
          <>
            <p className="text-xs text-muted-foreground">
              {respondedCount}/{totalCount} source{totalCount > 1 ? 's' : ''} ont répondu pour « {result.query} »
              {exitPricePerSqm === null && ' — prix de sortie pondéré non calculable (renseignez des lots avec prix et surface, onglet Lots).'}
            </p>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Prix bas</TableHead>
                    <TableHead className="text-right">Prix moyen</TableHead>
                    <TableHead className="text-right">Prix haut</TableHead>
                    <TableHead className="text-right">Prix de sortie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.sources.map((s) => (
                    <TableRow key={s.source}>
                      <TableCell>
                        {s.source}
                        {!s.available && <span className="ml-2 text-[10px] text-muted-foreground">({s.error ?? 'non disponible'})</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatPricePerSqm(s.priceLow)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatPricePerSqm(s.priceMid)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatPricePerSqm(s.priceHigh)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatPricePerSqm(exitPricePerSqm)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell>Moyenne</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatPricePerSqm(result.average?.priceLow ?? null)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatPricePerSqm(result.average?.priceMid ?? null)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatPricePerSqm(result.average?.priceHigh ?? null)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatPricePerSqm(exitPricePerSqm)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {respondedCount > 0 && (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => formatCurrency(v)} width={70} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number) => formatPricePerSqm(value)}
                    />
                    {exitPricePerSqm !== null && (
                      <ReferenceLine
                        y={exitPricePerSqm}
                        stroke="hsl(var(--primary))"
                        strokeDasharray="4 4"
                        label={{ value: 'Prix de sortie du projet', fontSize: 10, fill: 'hsl(var(--primary))', position: 'insideTopRight' }}
                      />
                    )}
                    <Bar dataKey="priceLow" fill="#eab308" name="Prix bas" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="priceHigh" fill="#ef4444" name="Prix haut" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Line type="monotone" dataKey="priceMid" stroke="hsl(var(--chart-accent))" strokeWidth={2} name="Prix moyen" dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        <p className="border-t border-border pt-3 text-[11px] leading-snug text-muted-foreground">
          Moyenne simple (non pondérée) des sources ayant répondu. Une source indisponible peut refléter une absence de donnée publiée pour cette
          ville/typologie, ou un changement de structure du site — jamais une valeur nulle silencieuse.
        </p>
      </CardContent>
    </Card>
  );
}
