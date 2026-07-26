import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Newspaper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useArticles } from '@/features/intelligence-marche/hooks/use-market-intelligence';
import { ARTICLE_CATEGORY_LABELS } from '@/types';

export function MarketNewsCard() {
  const { data, isLoading } = useArticles();
  const latest = data?.items?.[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Marché</CardTitle>
        <Link to="/market" className="text-xs text-muted-foreground hover:text-primary hover:underline">
          Tout voir
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !latest ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Aucune actualité pour l'instant</p>
        ) : (
          <Link to="/market" className="flex gap-2.5 rounded-md p-1.5 hover:bg-accent">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Newspaper className="h-4 w-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="shrink-0">
                  {ARTICLE_CATEGORY_LABELS[latest.category]}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(latest.publishedAt), { addSuffix: true, locale: fr })}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{latest.title}</p>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
