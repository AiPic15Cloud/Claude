import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { StageBadge, TypeBadge, ScoreBadge } from '../components/deal-badges';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Deal } from '@/types';

interface TableViewProps {
  deals: Deal[];
  onSelectDeal: (id: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'right';
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Opération', sortable: true },
  { key: 'type', label: 'Type' },
  { key: 'stage', label: 'Étape' },
  { key: 'city', label: 'Ville' },
  { key: 'amountTarget', label: 'Montant cible', sortable: true, align: 'right' },
  { key: 'amountRaised', label: 'Collecté', sortable: true, align: 'right' },
  { key: 'atlasScore', label: 'Score ATLAS', sortable: true, align: 'right' },
  { key: 'assignedTo', label: 'Assigné à' },
];

export function TableView({ deals, onSelectDeal, sortBy, sortOrder, onSort }: TableViewProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={cn('whitespace-nowrap px-4 py-2.5 font-medium', col.align === 'right' && 'text-right')}
              >
                {col.sortable ? (
                  <button
                    onClick={() => onSort(col.key)}
                    className={cn(
                      'inline-flex items-center gap-1 hover:text-foreground',
                      col.align === 'right' && 'flex-row-reverse',
                    )}
                  >
                    {col.label}
                    {sortBy === col.key ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr
              key={deal.id}
              onClick={() => onSelectDeal(deal.id)}
              className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent"
            >
              <td className="whitespace-nowrap px-4 py-2.5">
                <p className="font-medium">{deal.name}</p>
                <p className="text-xs text-muted-foreground">{deal.reference}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <TypeBadge type={deal.type} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StageBadge stage={deal.stage} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{deal.city ?? '—'}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatCurrency(deal.amountTarget)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatCurrency(deal.amountRaised)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <ScoreBadge score={deal.atlasScore} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                {deal.assignedTo ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deals.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Aucune opération ne correspond aux filtres.</p>}
    </div>
  );
}
