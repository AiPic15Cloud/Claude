import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
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
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/export-xlsx';
import { formatDate } from '@/lib/format';
import { DEAL_TYPE_LABELS, DEAL_STAGE_LABELS, DEAL_STATUS_LABELS } from '@/types';

export function PortfolioPage() {
  const [view, setView] = useState<PortfolioView>('kanban');
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<DealsFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    late: searchParams.get('late') === 'true',
  });
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

  const handleExport = () => {
    const rows = deals.map((d) => ({
      Référence: d.reference,
      Nom: d.name,
      Type: DEAL_TYPE_LABELS[d.type],
      Étape: DEAL_STAGE_LABELS[d.stage],
      Statut: DEAL_STATUS_LABELS[d.status],
      Ville: d.city ?? '',
      'Montant cible': Number(d.amountTarget),
      Collecté: Number(d.amountRaised),
      'Taux (%)': d.interestRate ? Number(d.interestRate) : null,
      'Fees (%)': d.feesRate ? Number(d.feesRate) : null,
      'Durée (mois)': d.durationMonths ?? null,
      'Date début': d.startDate ? formatDate(d.startDate) : '',
      'Date échéance': d.endDate ? formatDate(d.endDate) : '',
      'Score de risque': d.riskScore ?? null,
      Remboursé: d.repaid ? 'Oui' : 'Non',
    }));
    exportToExcel(`atlas-portefeuille-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Portefeuille', rows);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Portefeuille"
        description="Toutes les opérations de votre organisation."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={deals.length === 0}>
              <Download className="h-3.5 w-3.5" /> Exporter
            </Button>
            <CreateDealDialog />
          </>
        }
      />

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
