import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNewsletters, usePingNewsletter } from '../hooks/use-newsletters';
import { NEWSLETTER_STATUS_LABELS, type NewsletterStatus } from '@/types';
import { formatDate } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const STATUS_VARIANT: Record<NewsletterStatus, 'success' | 'warning' | 'destructive'> = {
  A_JOUR: 'success',
  A_RELANCER: 'warning',
  CRITIQUE: 'destructive',
};

export function NewslettersCard() {
  const { data: entries, isLoading } = useNewsletters();
  const ping = usePingNewsletter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Newsletters opérateurs</CardTitle>
        <span className="text-xs text-muted-foreground">{entries?.length ?? 0}</span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <Skeleton className="m-4 h-48" />}
        {!isLoading && entries?.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Aucune opération active</p>
        )}
        {!isLoading && entries && entries.length > 0 && (
          <div className="max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Projet</TableHead>
                  <TableHead>Dernière NL</TableHead>
                  <TableHead className="text-right">Écart (j)</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link to={`/deals/${e.id}`} className="font-medium hover:text-primary hover:underline">
                        {e.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">{e.lastNewsletterDate ? formatDate(e.lastNewsletterDate) : '—'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{e.daysSince ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[e.status]}>{NEWSLETTER_STATUS_LABELS[e.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => ping.mutate(e.id)} disabled={ping.isPending}>
                        <Mail className="h-3.5 w-3.5" /> NL envoyée
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
