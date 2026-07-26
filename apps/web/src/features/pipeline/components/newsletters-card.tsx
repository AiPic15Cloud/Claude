import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNewsletters, usePingNewsletter } from '../hooks/use-newsletters';
import { NEWSLETTER_STATUS_LABELS, type NewsletterStatus } from '@/types';
import { formatDate } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

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
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Projet</th>
                  <th className="px-4 py-2">Dernière NL</th>
                  <th className="px-4 py-2 text-right">Écart (j)</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 hover:bg-accent">
                    <td className="px-4 py-2">
                      <Link to={`/deals/${e.id}`} className="font-medium hover:text-primary hover:underline">
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{e.lastNewsletterDate ? formatDate(e.lastNewsletterDate) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{e.daysSince ?? '—'}</td>
                    <td className="px-4 py-2">
                      <Badge variant={STATUS_VARIANT[e.status]}>{NEWSLETTER_STATUS_LABELS[e.status]}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => ping.mutate(e.id)} disabled={ping.isPending}>
                        <Mail className="h-3.5 w-3.5" /> NL envoyée
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
