import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Landmark, Percent, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCockpitSummary } from './hooks/use-cockpit-summary';
import { KpiCard } from './components/kpi-card';
import { TaskListCard } from './components/task-list-card';
import { PipelineChart } from './components/pipeline-chart';
import { ActivityFeedCard } from './components/activity-feed-card';
import { AutoSummaryCard } from './components/auto-summary-card';
import { DeadlineAlertsCard } from './components/deadline-alerts-card';
import { FeesChartCard } from './components/fees-chart-card';
import { RepaymentsChartCard } from './components/repayments-chart-card';
import { Skeleton } from '@/components/ui/skeleton';
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
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting}, {user?.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Voici l'état de votre activité au {new Date(data.generatedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}.
        </p>
      </div>

      <AutoSummaryCard summary={data.autoSummary} generatedAt={data.generatedAt} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Opérations actives" value={String(data.kpis.activeDeals)} icon={Landmark} />
        <KpiCard
          label="Encours sous gestion"
          value={formatCurrency(data.kpis.totalAum)}
          icon={Wallet}
          hint={`${formatCurrency(data.kpis.totalRaised)} collectés`}
          trend="neutral"
        />
        <KpiCard
          label="Avancement de collecte"
          value={`${data.kpis.fundingProgress}%`}
          icon={TrendingUp}
          trend={data.kpis.fundingProgress >= 50 ? 'up' : 'neutral'}
        />
        <KpiCard label="Taux moyen" value={`${data.kpis.averageInterestRate}%`} icon={Percent} />
        <Link to="/portfolio?late=true">
          <KpiCard
            label="En retard"
            value={String(data.kpis.lateDeals)}
            icon={AlertTriangle}
            hint={data.kpis.lateDeals > 0 ? 'échéance dépassée' : 'RAS'}
            trend={data.kpis.lateDeals > 0 ? 'down' : 'neutral'}
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PipelineChart pipeline={data.pipeline} />
        </div>
        <TaskListCard title="Aujourd'hui" tasks={data.today} emptyLabel="Aucune tâche pour aujourd'hui" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FeesChartCard />
        <RepaymentsChartCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <DeadlineAlertsCard alerts={data.deadlineAlerts} />
        <TaskListCard title="Priorités" tasks={data.priorities} emptyLabel="Aucune priorité en attente" showDueDate />
        <TaskListCard title="Agenda (7 jours)" tasks={data.agenda} emptyLabel="Aucune échéance à venir" showDueDate />
        <ActivityFeedCard activities={data.recentActivity} />
      </div>
    </div>
  );
}
