import type { GraphNode } from '@/types';

const COLUMN_ORDER = ['PLATEFORME', 'PROMOTEUR', 'BANQUE', 'NOTAIRE', 'ARCHITECTE', 'COLLECTIVITE', 'INVESTISSEUR', 'DEAL'];

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 96;

/**
 * Deterministic column layout — nodes grouped by type into columns, stacked
 * top to bottom within their column. Simple and legible for the graph sizes
 * ATLAS deals with; swap for a force-directed layout if the graph grows
 * beyond a few hundred nodes.
 */
export function layoutGraph(nodes: GraphNode[]): Record<string, { x: number; y: number }> {
  const columns = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const key = COLUMN_ORDER.includes(node.type) ? node.type : 'AUTRE';
    if (!columns.has(key)) columns.set(key, []);
    columns.get(key)!.push(node);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  const orderedKeys = [...COLUMN_ORDER, 'AUTRE'].filter((k) => columns.has(k));

  orderedKeys.forEach((key, columnIndex) => {
    const nodesInColumn = columns.get(key)!;
    nodesInColumn.forEach((node, rowIndex) => {
      positions[node.id] = { x: columnIndex * COLUMN_WIDTH, y: rowIndex * ROW_HEIGHT };
    });
  });

  return positions;
}
