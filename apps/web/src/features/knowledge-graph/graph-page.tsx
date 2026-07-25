import { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGraph } from './hooks/use-graph';
import { layoutGraph } from './graph-layout';
import { EntityNode, type EntityNodeData } from './components/entity-node';
import { EntityDrawer } from './components/entity-drawer';
import { CreateEntityDialog } from './components/create-entity-dialog';
import { GRAPH_ENTITY_TYPE_LABELS, type GraphEntityType } from '@/types';
import { SlidersHorizontal } from 'lucide-react';

const ALL_TYPES: GraphEntityType[] = [
  'PROMOTEUR',
  'BANQUE',
  'NOTAIRE',
  'ARCHITECTE',
  'COLLECTIVITE',
  'INVESTISSEUR',
  'PLATEFORME',
];

const nodeTypes = { entity: EntityNode };

export function GraphPage() {
  const [activeTypes, setActiveTypes] = useState<GraphEntityType[]>(ALL_TYPES);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const { data, isLoading } = useGraph(activeTypes);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] };
    const positions = layoutGraph(data.nodes);

    const nodes: Node<EntityNodeData>[] = data.nodes.map((n) => ({
      id: n.id,
      type: 'entity',
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: { label: n.label, subtitle: n.subtitle, type: n.type as GraphEntityType | 'DEAL' },
    }));

    const edges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ?? e.type,
      style: { stroke: 'hsl(var(--border))' },
      labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
      animated: e.type === 'FINANCEUR',
    }));

    return { nodes, edges };
  }, [data]);

  const toggleType = (type: GraphEntityType) => {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">
            Promoteurs, banques, notaires, architectes, collectivités, investisseurs, plateformes et opérations —
            toutes les relations sont cliquables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Types ({activeTypes.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrer par type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_TYPES.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={activeTypes.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {GRAPH_ENTITY_TYPE_LABELS[type]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <CreateEntityDialog />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="flex-1" />
      ) : (
        <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
              if (node.id.startsWith('entity:')) setSelectedEntityId(node.id.replace('entity:', ''));
            }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!bg-secondary" />
          </ReactFlow>
        </div>
      )}

      <EntityDrawer entityId={selectedEntityId} onClose={() => setSelectedEntityId(null)} />
    </div>
  );
}
