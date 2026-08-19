import { useAuthStore } from '@/store/auth.store';
import { useCockpitSummary } from './hooks/use-cockpit-summary';
import { HeroMetric } from './components/hero-metric';
import { TaskListCard } from './components/task-list-card';
import { PipelineChart } from './components/pipeline-chart';
import { AumHistoryChart } from './components/aum-history-chart';
import { ActivityFeedCard } from './components/activity-feed-card';
import { AutoSummaryCard } from './components/auto-summary-card';
import { DecisionCenterCard } from './components/decision-center-card';
import { DeadlineAlertsCard } from './components/deadline-alerts-card';
import { FeesChartCard } from './components/fees-chart-card';
import { RepaymentsChartCard } from './components/repayments-chart-card';
import { PipelineFunnelCard } from './components/pipeline-funnel-card';
import { DealTypeDonutCard } from './components/deal-type-donut-card';
import { GuaranteesToRenewCard } from './components/guarantees-to-renew-card';
import { MarketDigestCard } from '@/features/intelligence-marche/components/market-digest-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { formatCurrency } from '@/lib/format';

export function CockpitPage() {
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

      <DecisionCenterCard decisions={data.decisions} />

      <AutoSummaryCard summary={data.autoSummary} generatedAt={data.generatedAt} />

      <MarketDigestCard />

      <HeroMetric
        label="Encours sous gestion"
        value={formatCurrency(data.kpis.totalAum)}
        context={`${formatCurrency(data.kpis.totalRaised)} collectés à ce jour`}
        stats={[
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FeesChartCard />
        <RepaymentsChartCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PipelineFunnelCard />
        <DealTypeDonutCard />
      </div>

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
