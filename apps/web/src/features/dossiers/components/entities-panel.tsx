import { useState } from 'react';
import { Loader2, Network, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDealEntities, useLinkDealEntity, useUnlinkDealEntity } from '../hooks/use-deal-entities';
import { useEntities } from '@/features/knowledge-graph/hooks/use-graph';
import { DEAL_ENTITY_ROLE_LABELS, GRAPH_ENTITY_TYPE_LABELS, type DealEntityRole } from '@/types';

const ROLES: DealEntityRole[] = [
  'PROMOTEUR',
  'BANQUE_FINANCEUR',
  'NOTAIRE',
  'ARCHITECTE',
  'COLLECTIVITE',
  'INVESTISSEUR',
  'GARANT',
  'AUTRE',
];

export function EntitiesPanel({ dealId }: { dealId: string }) {
  const { data: links = [] } = useDealEntities(dealId);
  const { data: entities = [] } = useEntities();
  const link = useLinkDealEntity(dealId);
  const unlink = useUnlinkDealEntity(dealId);
  const [open, setOpen] = useState(false);
  const [entityId, setEntityId] = useState<string>('');
  const [role, setRole] = useState<DealEntityRole>('PROMOTEUR');

  const availableEntities = entities.filter((e) => !links.some((l) => l.entityId === e.id));

  const submit = () => {
    if (!entityId) return;
    link.mutate({ entityId, role }, { onSuccess: () => { setOpen(false); setEntityId(''); } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Intervenants</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5" /> Lier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lier un intervenant</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Entité</Label>
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une entité" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEntities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} — {GRAPH_ENTITY_TYPE_LABELS[e.type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rôle</Label>
                <Select value={role} onValueChange={(v) => setRole(v as DealEntityRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {DEAL_ENTITY_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={!entityId || link.isPending}>
                {link.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Lier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {links.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Aucun intervenant lié</p>}
        {links.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-md border border-border p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Network className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{l.entity.name}</p>
              <p className="text-xs text-muted-foreground">{GRAPH_ENTITY_TYPE_LABELS[l.entity.type]}</p>
            </div>
            <Badge variant="secondary">{DEAL_ENTITY_ROLE_LABELS[l.role]}</Badge>
            <Button variant="ghost" size="icon" onClick={() => unlink.mutate(l.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
