import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Plus, RefreshCw, Rss } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useConnectors, useSources, useCreateSource, useTriggerFetch, useCollectAll } from '../hooks/use-market-intelligence';
import { cn } from '@/lib/utils';

export function SourcesPanel() {
  const { data: sources = [] } = useSources();
  const { data: connectors = [] } = useConnectors();
  const createSource = useCreateSource();
  const triggerFetch = useTriggerFetch();
  const collectAll = useCollectAll();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [connector, setConnector] = useState('');
  const [url, setUrl] = useState('');

  const submit = () => {
    if (!name || !connector) return;
    createSource.mutate(
      { name, connector, url: url || undefined },
      { onSuccess: () => { setOpen(false); setName(''); setConnector(''); setUrl(''); } },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Sources</CardTitle>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => collectAll.mutate()} disabled={collectAll.isPending}>
            <RefreshCw className={cn('h-3.5 w-3.5', collectAll.isPending && 'animate-spin')} />
            Tout collecter
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle source</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="source-name">Nom</Label>
                <Input id="source-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Connecteur</Label>
                <Select value={connector} onValueChange={setConnector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un connecteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectors.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="source-url">Requête / URL (optionnel)</Label>
                <Input id="source-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="permis de construire logement" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={!name || !connector || createSource.isPending}>
                {createSource.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {sources.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Aucune source configurée</p>}
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
            <Rss className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={source.name}>
                {source.name}
              </p>
              {source.lastFetchedAt && (
                <p className="truncate text-[11px] text-muted-foreground">
                  Collecté {formatDistanceToNow(new Date(source.lastFetchedAt), { addSuffix: true, locale: fr })}
                </p>
              )}
            </div>
            {!source.active && <Badge variant="secondary">Inactive</Badge>}
            {source.connector !== 'manual' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => triggerFetch.mutate(source.id)}
                disabled={triggerFetch.isPending}
                aria-label={`Collecter ${source.name}`}
                title={`Collecter ${source.name}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
