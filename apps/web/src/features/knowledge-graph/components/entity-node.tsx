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

const TYPE_COLOR: Record<GraphEntityType | 'DEAL', string> = {
  PROMOTEUR: 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
  BANQUE: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
  NOTAIRE: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
  ARCHITECTE: 'text-fuchsia-600 bg-fuchsia-500/10 dark:text-fuchsia-400',
  COLLECTIVITE: 'text-cyan-600 bg-cyan-500/10 dark:text-cyan-400',
  INVESTISSEUR: 'text-orange-600 bg-orange-500/10 dark:text-orange-400',
  PLATEFORME: 'text-violet-600 bg-violet-500/10 dark:text-violet-400',
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
