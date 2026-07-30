import { useState } from 'react';
import { ChevronDown, Loader2, Mail, Phone, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEntities, useDeleteEntity } from '@/features/knowledge-graph/hooks/use-graph';
import { CreateEntityDialog } from '@/features/knowledge-graph/components/create-entity-dialog';
import { EntityDrawer } from '@/features/knowledge-graph/components/entity-drawer';
import { GRAPH_ENTITY_TYPE_LABELS, type GraphEntity, type GraphEntityType } from '@/types';

// Plateformes concurrentes vivent uniquement dans Intelligence Concurrentielle —
// le Répertoire ne liste que les contacts réels (porteurs, banques, notaires…).
const HIDDEN_TYPES: GraphEntityType[] = ['PLATEFORME'];
const TYPES: GraphEntityType[] = ['PROMOTEUR', 'BANQUE', 'NOTAIRE', 'ARCHITECTE', 'COLLECTIVITE', 'INVESTISSEUR'];

function ContactRow({ entity, onOpen }: { entity: GraphEntity; onOpen: () => void }) {
  const remove = useDeleteEntity();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="flex items-center gap-3 p-3.5">
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onOpen}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{entity.name}</p>
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {GRAPH_ENTITY_TYPE_LABELS[entity.type]}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {entity.contactName && <span>{entity.contactName}</span>}
              {entity.city && <span>{entity.city}</span>}
              {entity.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {entity.email}
                </span>
              )}
              {entity.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {entity.phone}
                </span>
              )}
            </div>
          </div>
        </button>
        {entity._count && entity._count.dealLinks > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {entity._count.dealLinks} dossier{entity._count.dealLinks > 1 ? 's' : ''}
          </span>
        )}
        <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-1">
          <CreateEntityDialog
            entity={entity}
            hideTypes={HIDDEN_TYPES}
            trigger={<Button size="sm" variant="ghost">Modifier</Button>}
          />
          {confirming ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Annuler
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove.mutate(entity.id)} disabled={remove.isPending}>
                {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirmer'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RepertoirePage() {
  const [type, setType] = useState<GraphEntityType | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: rawEntities = [], isLoading } = useEntities({ type, search: search || undefined });
  const entities = rawEntities.filter((e) => !HIDDEN_TYPES.includes(e.type));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Répertoire</h1>
          <p className="text-sm text-muted-foreground">
            Coordonnées de vos porteurs de projet, banques, notaires et autres partenaires.
          </p>
        </div>
        <CreateEntityDialog hideTypes={HIDDEN_TYPES} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un nom, un contact…"
          className="max-w-xs"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {type ? GRAPH_ENTITY_TYPE_LABELS[type] : 'Tous les types'}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setType(undefined)}>Tous les types</DropdownMenuItem>
            {TYPES.map((t) => (
              <DropdownMenuItem key={t} onClick={() => setType(t)}>
                {GRAPH_ENTITY_TYPE_LABELS[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {!isLoading && entities.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">Aucune fiche pour ce filtre.</p>
      )}

      <div className="flex flex-col gap-2">
        {entities.map((entity) => (
          <ContactRow key={entity.id} entity={entity} onOpen={() => setSelectedId(entity.id)} />
        ))}
      </div>

      <EntityDrawer entityId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
