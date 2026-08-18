import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CreateArticleDialog } from './components/create-article-dialog';
import { IndicatorsStrip } from './components/indicators-strip';
import { RateHistoryChart } from './components/rate-history-chart';
import { BuildingPermitsChart } from './components/building-permits-chart';
import { HousePriceIndexChart } from './components/house-price-index-chart';
import { ConstructionCostIndexChart } from './components/construction-cost-index-chart';
import { PortfolioRateBenchmarkCard } from './components/portfolio-rate-benchmark-card';
import { DvfSearchCard } from './components/dvf-search-card';
import { MarketDigestCard } from './components/market-digest-card';
import { SourcesPanel } from './components/sources-panel';
import { useArticles, useCollectAll } from './hooks/use-market-intelligence';
import { ARTICLE_CATEGORY_LABELS, type ArticleCategory, type Priority } from '@/types';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';

const CATEGORIES = Object.keys(ARTICLE_CATEGORY_LABELS) as ArticleCategory[];

const PRIORITY_VARIANT: Record<Priority, 'default' | 'warning' | 'destructive' | 'secondary'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export function MarchePage() {
  const [category, setCategory] = useState<ArticleCategory | undefined>(undefined);
  const { data, isLoading } = useArticles({ category });
  const collectAll = useCollectAll();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Marché"
        description="Veille agrégée, dédoublonnée et priorisée — data.gouv.fr en automatique, saisie manuelle en complément."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => collectAll.mutate()} disabled={collectAll.isPending}>
              <RefreshCw className={cn('h-3.5 w-3.5', collectAll.isPending && 'animate-spin')} />
              Actualiser
            </Button>
            <CreateArticleDialog />
          </>
        }
      />

      <IndicatorsStrip />

      <PortfolioRateBenchmarkCard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RateHistoryChart />
        <BuildingPermitsChart />
        <HousePriceIndexChart />
        <ConstructionCostIndexChart />
      </div>

      <DvfSearchCard />

      <MarketDigestCard />

      <SourcesPanel />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {category ? ARTICLE_CATEGORY_LABELS[category] : 'Toutes catégories'}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setCategory(undefined)}>Toutes catégories</DropdownMenuItem>
              {CATEGORIES.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setCategory(c)}>
                  {ARTICLE_CATEGORY_LABELS[c]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}

        {!isLoading && data?.items.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucune actualité pour ce filtre.</p>
        )}

        <div className="flex flex-col gap-2">
          {data?.items.map((article) => (
            <Card key={article.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Newspaper className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{article.title}</p>
                    <Badge variant={PRIORITY_VARIANT[article.priority]}>{article.priority}</Badge>
                    <Badge variant="outline">{ARTICLE_CATEGORY_LABELS[article.category]}</Badge>
                  </div>
                  {article.summary && <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{article.source?.name}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: fr })}</span>
                    {article.url && (
                      <a href={article.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Source
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
