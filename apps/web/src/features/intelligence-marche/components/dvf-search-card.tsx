import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useDvfSearch } from '../hooks/use-dvf-search';
import { formatCurrency, formatDate } from '@/lib/format';

export function DvfSearchCard() {
  const [query, setQuery] = useState('');
  const search = useDvfSearch();

  const handleSearch = () => {
    if (!query.trim()) return;
    search.mutate(query.trim());
  };

  const result = search.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparables — transactions DVF</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ville (ex. Bordeaux, Rennes, Lyon 6e)…"
            className="flex-1"
          />
          <Button size="sm" onClick={handleSearch} disabled={!query.trim() || search.isPending}>
            {search.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Rechercher
          </Button>
        </div>

        {search.isError && <p className="text-xs text-destructive">Recherche indisponible pour le moment.</p>}

        {result && !result.commune && (
          <p className="text-sm text-muted-foreground">Ville introuvable — précise le nom exact ou ajoute le code postal.</p>
        )}

        {result?.commune && result.sampleSize === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune transaction exploitable trouvée pour {result.commune.name}. Le fichier DVF peut ne pas encore être publié pour
            cette commune/année, ou être temporairement indisponible.
          </p>
        )}

        {result?.commune && result.sampleSize > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Commune</p>
                <p className="mt-1 text-lg font-semibold">{result.commune.name}</p>
                <p className="text-xs text-muted-foreground">{result.commune.postcode}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prix moyen / m²</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {result.averagePricePerSqm ? formatCurrency(result.averagePricePerSqm) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Médiane / m²</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {result.medianPricePerSqm ? formatCurrency(result.medianPricePerSqm) : '—'}
                </p>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Surface</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                    <TableHead className="text-right">€/m²</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.transactions.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{t.date ? formatDate(t.date) : '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{t.address ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{t.type ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {t.surface ? `${t.surface} m²` : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {t.price ? formatCurrency(t.price) : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {t.pricePerSqm ? formatCurrency(t.pricePerSqm) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <p className="text-[11px] text-muted-foreground">
          Source : DVF (Demandes de valeurs foncières), data.gouv.fr — transactions réelles déclarées, via les fichiers officiels
          geo-dvf (Etalab/DGFiP). Géolocalisation par la Base Adresse Nationale (api-adresse.data.gouv.fr).
        </p>
      </CardContent>
    </Card>
  );
}
