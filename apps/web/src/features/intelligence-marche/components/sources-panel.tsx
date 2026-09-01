import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreateSourceDialog } from './create-source-dialog';
import { useFetchSource, useSetSourceActive, useSources } from '../hooks/use-market-intelligence';

export function SourcesPanel() {
  const { data: sources = [], isLoading } = useSources();
  const setActive = useSetSourceActive();
  const fetchSource = useFetchSource();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Sources de veille</CardTitle>
        <CreateSourceDialog />
      </CardHeader>
      <CardContent>
        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && sources.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune source configurée.</p>
        )}
        {sources.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Connecteur</TableHead>
                <TableHead>Dernière collecte</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{source.connector}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {source.lastFetchedAt
                      ? formatDistanceToNow(new Date(source.lastFetchedAt), { addSuffix: true, locale: fr })
                      : 'Jamais'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={source.active}
                      onCheckedChange={(active) => setActive.mutate({ id: source.id, active })}
                      disabled={setActive.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={source.connector === 'manual' || fetchSource.isPending}
                      onClick={() => fetchSource.mutate(source.id)}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', fetchSource.isPending && 'animate-spin')} />
                      Collecter
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
