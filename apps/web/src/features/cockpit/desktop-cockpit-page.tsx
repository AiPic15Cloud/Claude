import { useAuthStore } from '@/store/auth.store';
import { useCockpitSummary } from './hooks/use-cockpit-summary';
import { HeroMetric } from './components/hero-metric';
import { TaskListCard } from './components/task-list-card';
import { PipelineChart } from './components/pipeline-chart';
import { AumHistoryChart } from './components/aum-history-chart';
import { ActivityFeedCard } from './components/activity-feed-card';
import { AutoSummaryCard } from './components/auto-summary-card';
import { DecisionCenterCard } from './components/decision-center-card';
import { ActionFollowUpCard } from './components/action-followup-card';
import { PerformanceUtileCard } from './components/performance-utile-card';
import { ModelValidationCard } from './components/model-validation-card';
import { DeadlineAlertsCard } from './components/deadline-alerts-card';
import { FeesChartCard } from './components/fees-chart-card';
import { RepaymentsChartCard } from './components/repayments-chart-card';
import { PipelineFunnelCard } from './components/pipeline-funnel-card';
import { DealTypeDonutCard } from './components/deal-type-donut-card';
import { RiskExposureCard } from './components/risk-exposure-card';
import { ConcentrationCard } from './components/concentration-card';
import { GuaranteesToRenewCard } from './components/guarantees-to-renew-card';
import { MarketDigestCard } from '@/features/intelligence-marche/components/market-digest-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { formatCurrency } from '@/lib/format';

/**
 * ~15 blocs d'analyse à la suite sans aucun repère n'avait plus rien d'un
 * "coup d'œil" — juste un mur de cartes (retour utilisateur direct). Un
 * séparateur de section reste sous le radar (pas un nouveau Card, pas de
 * fond) : juste de quoi dire "vous changez de sujet" en scrollant.
 */
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function DesktopCockpitPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useCockpitSummary();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Skeleton className="h-28 w-64" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        description={`Voici l'état de votre activité au ${new Date(data.generatedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}.`}
      />

      <DecisionCenterCard cards={data.actionQueue.aDecider} />

      <ActionFollowUpCard aFaire={data.actionQueue.aFaire} enAttente={data.actionQueue.enAttente} />

      <SectionLabel>Synthèse</SectionLabel>

      <PerformanceUtileCard data={data.fractionalPipelineConversion} />

      <ModelValidationCard />

      <AutoSummaryCard summary={data.autoSummary} generatedAt={data.generatedAt} />

      <MarketDigestCard />

      <SectionLabel>Vue d'ensemble</SectionLabel>

      <HeroMetric
        label="Encours sous gestion"
        value={formatCurrency(data.kpis.totalCrd)}
        context={`${formatCurrency(data.kpis.totalRaised)} collectés à ce jour`}
        stats={[
          { label: 'Objectif de collecte', value: formatCurrency(data.kpis.totalTarget) },
          { label: 'Avancement de collecte', value: `${data.kpis.fundingProgress}%` },
          { label: 'Taux moyen', value: `${data.kpis.averageInterestRate}%` },
          {
            label: 'En retard',
            value: String(data.kpis.lateDeals),
            href: '/portfolio?late=true',
            tone: data.kpis.lateDeals > 0 ? 'down' : 'default',
          },
        ]}
      />

      <AumHistoryChart history={data.aumHistory} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PipelineChart pipeline={data.pipeline} />
        </div>
        <TaskListCard title="Aujourd'hui" tasks={data.today} emptyLabel="Aucune tâche pour aujourd'hui" quickAdd />
      </div>

      <SectionLabel>Performance</SectionLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FeesChartCard />
        <RepaymentsChartCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PipelineFunnelCard />
        <DealTypeDonutCard />
      </div>

      <SectionLabel>Risque</SectionLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RiskExposureCard exposureByRiskTier={data.kpis.exposureByRiskTier} stressTest={data.kpis.stressTest} />
        <ConcentrationCard operators={data.kpis.topOperatorConcentration} cities={data.kpis.exposureByCity} />
      </div>

      <SectionLabel>Échéances &amp; activité</SectionLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <DeadlineAlertsCard alerts={data.deadlineAlerts} />
        <TaskListCard title="Priorités" tasks={data.priorities} emptyLabel="Aucune priorité en attente" showDueDate />
        <TaskListCard title="Agenda (7 jours)" tasks={data.agenda} emptyLabel="Aucune échéance à venir" showDueDate />
        <ActivityFeedCard activities={data.recentActivity} />
        <GuaranteesToRenewCard guarantees={data.guaranteesToRenew} />
      </div>
    </div>
  );
}
