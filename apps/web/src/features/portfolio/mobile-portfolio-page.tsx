import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { DealSearchField } from './components/deal-search-field';
import { ListView } from './views/list-view';
import { useDeals, type DealsFilters } from './hooks/use-deals';
import { useCockpitSummary } from '@/features/cockpit/hooks/use-cockpit-summary';
import { useRecentDealsStore } from '@/store/recent-deals.store';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

/**
 * Portefeuille mobile — écran distinct du desktop plutôt qu'une variante à
 * coups de `hidden md:*` : la doctrine ici n'est pas "les mêmes blocs, en
 * plus petit" mais "que faut-il vraiment pour rejoindre un projet en un
 * geste". Retour utilisateur direct : trop de couleurs et de boutons
 * concurrents, pas assez de respiration, trop de taps avant une info.
 * Réponses : une seule couleur qui parle à la fois (le rouge, réservé à ce
 * qui réclame une action, jamais répété ailleurs), pas de tableau de bord
 * chiffré au-dessus de la liste, recherche + "Récents" comme chemin le plus
 * court, une ligne = un projet sans badge concurrent.
 */
export function MobilePortfolioPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DealsFilters>({ sortBy: 'createdAt', sortOrder: 'desc' });
  const { data, isLoading } = useDeals(filters);
  const deals = data?.items ?? [];

  // Même file unifiée que le Cockpit (À décider — Deal en risque, blocage
  // Préqual, ActionItem), déjà triée blocage-puis-échéance : son premier
  // élément est "ce qui réclame vraiment une action" au sens large, pas
  // seulement un Deal en tier HIGH comme avant (régression identique à
  // celle corrigée sur le Cockpit desktop — voir decision-center-card.tsx).
  const { data: cockpit } = useCockpitSummary();
  const urgent = cockpit?.actionQueue.aDecider[0] ?? null;
  const urgentDealId = urgent ? (/^\/deals\/([^/?]+)/.exec(urgent.deepLink)?.[1] ?? null) : null;

  const recentDeals = useRecentDealsStore((s) => s.deals);
  const addRecentDeal = useRecentDealsStore((s) => s.addRecentDeal);

  const openDeal = (id: string, name: string) => {
    addRecentDeal({ id, name });
    navigate(`/deals/${id}`);
  };

  const openUrgent = () => {
    if (!urgent) return;
    if (urgentDealId) addRecentDeal({ id: urgentDealId, name: urgent.operation });
    navigate(urgent.deepLink);
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Portefeuille" className="px-1" />

      <div className="pt-5">
        <DealSearchField
          filters={filters}
          onChange={setFilters}
          placeholder="Nom, ville, référence…"
          inputClassName="h-12 text-[15px]"
        />
      </div>

      {recentDeals.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-4 text-sm">
          <span className="text-xs text-muted-foreground">Récents</span>
          {recentDeals.map((d, i) => (
            <span key={d.id} className="flex items-baseline gap-2">
              {i > 0 && <span className="text-muted-foreground/50">·</span>}
              <button
                onClick={() => openDeal(d.id, d.name)}
                className="border-b border-foreground/20 text-[13px] text-foreground/80"
              >
                {d.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* La seule note colorée de l'écran : ce qui réclame vraiment une action.
          Absente s'il n'y a rien de critique — jamais un bandeau vide ou générique. */}
      {urgent && (
        <button onClick={openUrgent} className="flex items-start gap-2.5 pt-8 text-left">
          <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', urgent.blocking ? 'bg-destructive' : 'bg-warning')} />
          <span className="flex-1">
            <span className={cn('block text-[11px] font-semibold uppercase tracking-wide', urgent.blocking ? 'text-destructive' : 'text-warning')}>
              Nécessite une action
            </span>
            <span className="mt-0.5 block text-[15px] font-medium">
              {urgent.operation} — {urgent.motif}
            </span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      <p className="pt-8 pb-3 text-xs text-muted-foreground">
        {isLoading ? 'Chargement…' : `${deals.length} opération${deals.length > 1 ? 's' : ''}`}
      </p>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <ListView
          deals={deals}
          onSelectDeal={(id) => openDeal(id, deals.find((d) => d.id === id)?.name ?? '')}
          mutedStatusDealIds={urgentDealId ? [urgentDealId] : undefined}
        />
      )}
    </div>
  );
}
