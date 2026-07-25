import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeal } from '@/features/portfolio/hooks/use-deals';
import { StageBadge, TypeBadge, ScoreBadge } from '@/features/portfolio/components/deal-badges';
import { TagBadge } from '@/features/portfolio/components/tag-badge';
import { ScoreBreakdownCard } from './components/score-breakdown-card';
import { GuaranteesPanel } from './components/guarantees-panel';
import { FinancialModelPanel } from './components/financial-model-panel';
import { EntitiesPanel } from './components/entities-panel';
import { AgentChatPanel } from '@/features/agents/components/agent-chat-panel';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';

const ANALYST_AGENT = { key: 'analyst', name: 'Analyst', description: "Analyse le dossier ouvert." };

export function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading } = useDeal(id ?? null);

  if (isLoading || !deal) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/portfolio">
            <ArrowLeft className="h-3.5 w-3.5" /> Portefeuille
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{deal.reference}</span>
              <TypeBadge type={deal.type} />
              <StageBadge stage={deal.stage} />
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{deal.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {deal.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {deal.city}
                </span>
              )}
              {deal.tags.map(({ tag }) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          </div>
          <ScoreBadge score={deal.atlasScore} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Montant cible</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(deal.amountTarget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Collecté</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(deal.amountRaised)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taux</p>
            <p className="text-lg font-semibold tabular-nums">{deal.interestRate ? `${deal.interestRate}%` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Échéance</p>
            <p className="text-lg font-semibold">{deal.endDate ? formatDate(deal.endDate) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="score">
        <TabsList>
          <TabsTrigger value="score">Score ATLAS</TabsTrigger>
          <TabsTrigger value="guarantees">Garanties</TabsTrigger>
          <TabsTrigger value="financial">Modèle financier</TabsTrigger>
          <TabsTrigger value="entities">Intervenants</TabsTrigger>
          <TabsTrigger value="assistant">Assistant IA</TabsTrigger>
        </TabsList>

        <TabsContent value="score">
          <ScoreBreakdownCard dealId={deal.id} />
        </TabsContent>
        <TabsContent value="guarantees">
          <GuaranteesPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="financial">
          <FinancialModelPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="entities">
          <EntitiesPanel dealId={deal.id} />
        </TabsContent>
        <TabsContent value="assistant" className="h-[32rem]">
          <AgentChatPanel agent={ANALYST_AGENT} dealId={deal.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
