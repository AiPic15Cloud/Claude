import { Handle, Position } from '@xyflow/react';
import { Building2, Landmark, Scale, Ruler, Building, Wallet, LineChart, FileStack } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GraphEntityType } from '@/types';

const TYPE_ICON: Record<GraphEntityType | 'DEAL', typeof Building2> = {
  PROMOTEUR: Building2,
  BANQUE: Landmark,
  NOTAIRE: Scale,
  ARCHITECTE: Ruler,
  COLLECTIVITE: Building,
  INVESTISSEUR: Wallet,
  PLATEFORME: LineChart,
  DEAL: FileStack,
};

// Entity type is identity, not status — every type gets the same neutral
// treatment (icon shape carries the distinction) except the deal itself,
// which anchors the graph and gets the sole accent color.
const TYPE_COLOR: Record<GraphEntityType | 'DEAL', string> = {
  PROMOTEUR: 'text-foreground bg-muted',
  BANQUE: 'text-foreground bg-muted',
  NOTAIRE: 'text-foreground bg-muted',
  ARCHITECTE: 'text-foreground bg-muted',
  COLLECTIVITE: 'text-foreground bg-muted',
  INVESTISSEUR: 'text-foreground bg-muted',
  PLATEFORME: 'text-foreground bg-muted',
  DEAL: 'text-primary bg-primary/10',
};

export interface EntityNodeData {
  label: string;
  subtitle?: string | null;
  type: GraphEntityType | 'DEAL';
  [key: string]: unknown;
}

export function EntityNode({ data, selected }: { data: EntityNodeData; selected?: boolean }) {
  const Icon = TYPE_ICON[data.type] ?? FileStack;
  return (
    <div
      className={cn(
        'flex w-56 items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-colors',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-border" />
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', TYPE_COLOR[data.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{data.label}</p>
        {data.subtitle && <p className="truncate text-xs text-muted-foreground">{data.subtitle}</p>}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-border" />
    </div>
  );
}
