import { useState } from 'react';
import { Building2, Loader2, Search } from 'lucide-react';
import { Bar, ComposedChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useMarketPrice, type MarketPriceTypology } from '../hooks/use-market-price';
import { formatCurrency } from '@/lib/format';

const TYPOLOGY_LABELS: Record<MarketPriceTypology, string> = {
  MAISON: 'Maison',
  APPARTEMENT: 'Appartement',
  TERRAIN_A_BATIR: 'Terrain à bâtir',
};

function formatPricePerSqm(value: number | null): string {
  return value !== null ? `${formatCurrency(value)}/m²` : '—';
}

/**
 * Recherche de prix au m² à la demande (spec ATLAS v2, C.8) — ponctuelle,
 * déclenchée au clic, sans infrastructure de collecte continue (à la
 * différence du Market Intelligence Engine, C.1-C.7). Chaque source
 * indisponible reste visible dans le tableau avec sa raison, jamais omise
 * silencieusement (doctrine section 0.2).
 */
export function MarketPriceSheet({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false);
  const [typology, setTypology] = useState<MarketPriceTypology | ''>('');
  const search = useMarketPrice(dealId);
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
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Building2 className="h-3.5 w-3.5" /> Prix du marché
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Prix du marché au m²</SheetTitle>
          <SheetDescription>
            Fourchette basse/moyenne/haute issue de 6 sources externes, comparée au prix de sortie du projet.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
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
                {exitPricePerSqm === null && ' — prix de sortie non renseigné dans le modèle financier.'}
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
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        className="fill-muted-foreground"
                        tickFormatter={(v) => formatCurrency(v)}
                        width={70}
                      />
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
            Moyenne simple (non pondérée) des sources ayant répondu. Une source indisponible peut refléter une absence de donnée
            publiée pour cette ville/typologie, ou un changement de structure du site — jamais une valeur nulle silencieuse.
          </p>
        </div>
      </SheetContent>
      </Sheet>
    </>
  );
}
