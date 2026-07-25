import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KpiBar } from './components/kpi-bar';
import { FiltersBar } from './components/filters-bar';
import { ViewSwitcher, type PortfolioView } from './components/view-switcher';
import { CreateDealDialog } from './components/create-deal-dialog';
import { DealDrawer } from './components/deal-drawer';
import { KanbanView } from './views/kanban-view';
import { ListView } from './views/list-view';
import { TableView } from './views/table-view';
import { MapView } from './views/map-view';
import { useDeals, type DealsFilters } from './hooks/use-deals';
import { Skeleton } from '@/components/ui/skeleton';

export function PortfolioPage() {
  const [view, setView] = useState<PortfolioView>('kanban');
  const [filters, setFilters] = useState<DealsFilters>({ sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchParams, setSearchParams] = useSearchParams();
  const dealId = searchParams.get('dealId');

  const { data, isLoading } = useDeals(filters);
  const deals = data?.items ?? [];

  const openDeal = (id: string) => setSearchParams((prev) => ({ ...Object.fromEntries(prev), dealId: id }));
  const closeDeal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('dealId');
    setSearchParams(next);
  };

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Portefeuille</h1>
          <p className="text-sm text-muted-foreground">Toutes les opérations de votre organisation.</p>
        </div>
        <CreateDealDialog />
      </div>

      <KpiBar />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltersBar filters={filters} onChange={setFilters} />
        <ViewSwitcher value={view} onChange={setView} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <>
          {view === 'kanban' && <KanbanView deals={deals} onSelectDeal={openDeal} />}
          {view === 'list' && <ListView deals={deals} onSelectDeal={openDeal} />}
          {view === 'table' && (
            <TableView
              deals={deals}
              onSelectDeal={openDeal}
              sortBy={filters.sortBy ?? 'createdAt'}
              sortOrder={filters.sortOrder ?? 'desc'}
              onSort={handleSort}
            />
          )}
          {view === 'map' && <MapView deals={deals} onSelectDeal={openDeal} />}
        </>
      )}

      <DealDrawer dealId={dealId} onClose={closeDeal} />
    </div>
  );
}
