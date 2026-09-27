import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRecentDealsStore } from '@/store/recent-deals.store';
import { useCockpitSummary } from './hooks/use-cockpit-summary';
import { TaskListCard } from './components/task-list-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Cockpit mobile — même doctrine que le Portefeuille mobile (voir son
 * commentaire d'en-tête) : un écran de "qu'est-ce qui a besoin de moi
 * maintenant", pas le tableau de bord complet du desktop. Le desktop garde
 * ses ~15 blocs (graphiques, concentration, funnel…) pour une session
 * d'analyse ; ici on ne montre que le Centre de décision (déjà, par
 * conception, "ce dont vous devez vous occuper aujourd'hui") et les tâches
 * du jour — tout le reste est un détour d'analyse qui n'a pas sa place dans
 * un coup d'œil au téléphone.
 */
export function MobileCockpitPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useCockpitSummary();
  const addRecentDeal = useRecentDealsStore((s) => s.addRecentDeal);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  const openCard = (deepLink: string, operation: string) => {
    const dealMatch = /^\/deals\/([^/?]+)/.exec(deepLink);
    if (dealMatch) addRecentDeal({ id: dealMatch[1], name: operation });
    navigate(deepLink);
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-16 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title={`${greeting}, ${user?.firstName}`} />

      <div className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Encours sous gestion</p>
        <p className="mt-1 font-display text-5xl font-light tracking-tight tabular-nums">{formatCurrency(data.kpis.totalCrd)}</p>
        {data.kpis.lateDeals > 0 && (
          <button
            onClick={() => navigate('/portfolio?late=true')}
            className="mt-2 text-sm font-medium text-destructive"
          >
            {data.kpis.lateDeals} dossier{data.kpis.lateDeals > 1 ? 's' : ''} en retard →
          </button>
        )}
      </div>

      <div className="pt-10">
        <p className="pb-1 text-xs text-muted-foreground">À décider</p>
        {data.actionQueue.aDecider.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Aucun dossier ne nécessite d'attention immédiate.</p>
        ) : (
          <div className="flex flex-col">
            {data.actionQueue.aDecider.map((card) => (
              <button
                key={card.id}
                onClick={() => openCard(card.deepLink, card.operation)}
                className="flex items-start gap-3 border-b border-border/60 py-4 text-left last:border-b-0"
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', card.blocking ? 'bg-destructive' : 'bg-warning')} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-medium">{card.operation}</span>
                    <span className={cn('shrink-0 text-[11px] font-medium', card.blocking ? 'text-destructive' : 'text-warning')}>{card.ctaLabel}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{card.motif}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pt-10">
        <TaskListCard title="Aujourd'hui" tasks={data.today} emptyLabel="Aucune tâche pour aujourd'hui" quickAdd />
      </div>
    </div>
  );
}
