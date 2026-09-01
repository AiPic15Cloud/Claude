import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { StageBadge, TypeBadge, RiskScoreBadge } from '../components/deal-badges';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
  { key: 'riskScore', label: 'Risque', sortable: true, align: 'right' },
  { key: 'assignedTo', label: 'Assigné à' },
];

export function TableView({ deals, onSelectDeal, sortBy, sortOrder, onSort }: TableViewProps) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/40 hover:bg-secondary/40">
            {COLUMNS.map((col) => (
              <TableHead key={col.key} className={cn('whitespace-nowrap', col.align === 'right' && 'text-right')}>
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
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id} onClick={() => onSelectDeal(deal.id)} className="cursor-pointer">
              <TableCell className="whitespace-nowrap">
                <p className="font-medium">{deal.name}</p>
                <p className="text-xs text-muted-foreground">{deal.reference}</p>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <TypeBadge type={deal.type} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <StageBadge stage={deal.stage} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{deal.city ?? '—'}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{formatCurrency(deal.amountTarget)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{formatCurrency(deal.amountRaised)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <RiskScoreBadge score={deal.riskScore} previousScore={deal.riskScorePrevious} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {deal.assignedTo ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}` : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {deals.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Aucune opération ne correspond aux filtres.</p>}
    </div>
  );
}
