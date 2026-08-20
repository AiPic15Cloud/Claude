import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useDealFieldChanges } from '../hooks/use-field-changes';
import { formatDate } from '@/lib/format';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  Deal: 'Dossier',
  FinancialAssumption: 'Modèle financier',
};

/**
 * Registre structuré par champ (gouvernance de la donnée) — distinct du
 * journal d'activité au-dessus : chaque ligne ici est une valeur comparable
 * avant/après, avec qui l'a changée, quand, et le document qui la justifie
 * le cas échéant, plutôt qu'un événement narratif.
 */
export function FieldHistoryPanel({ dealId }: { dealId: string }) {
  const { data: changes, isLoading } = useDealFieldChanges(dealId);

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading && <Skeleton className="m-4 h-48" />}
        {!isLoading && (!changes || changes.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune modification de valeur enregistrée sur ce dossier.</p>
        )}
        {!isLoading && changes && changes.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Champ</TableHead>
                <TableHead>Ancienne valeur → Nouvelle valeur</TableHead>
                <TableHead>Par</TableHead>
                <TableHead>Le</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">
                    <p className="font-medium">{c.fieldLabel}</p>
                    <p className="text-xs text-muted-foreground">{ENTITY_TYPE_LABELS[c.entityType] ?? c.entityType}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="text-muted-foreground">{c.oldValue ?? '—'}</span> → <span className="text-foreground">{c.newValue ?? '—'}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {c.changedBy ? `${c.changedBy.firstName} ${c.changedBy.lastName}` : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(c.changedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {c.sourceDocument ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {c.sourceDocument.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
