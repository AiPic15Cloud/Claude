import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Download, Printer, Loader2 } from 'lucide-react';
import { KpiBar } from './components/kpi-bar';
import { PortfolioOverviewCard } from './components/portfolio-overview-card';
import { FiltersBar } from './components/filters-bar';
import { ViewSwitcher, type PortfolioView } from './components/view-switcher';
import { CreateDealDialog } from './components/create-deal-dialog';
import { DealDrawer } from './components/deal-drawer';
import { KanbanView } from './views/kanban-view';
import { ListView } from './views/list-view';
import { TableView } from './views/table-view';
import { MapView } from './views/map-view';
import { useDeals, useDealKpis, type DealsFilters } from './hooks/use-deals';
import { useExportPortfolioReport, useExportPortfolioReportPdf } from '@/features/cockpit/hooks/use-cockpit-summary';
import { useCanValidate } from '@/features/auth/use-auth';
import { useIsMobile } from '@/lib/use-is-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/export-xlsx';
import { exportToJson } from '@/lib/export-json';
import { formatDate } from '@/lib/format';
import { DEAL_TYPE_LABELS, DEAL_STAGE_LABELS, DEAL_STATUS_LABELS } from '@/types';

export function PortfolioPage() {
  const isMobile = useIsMobile();
  // Le Kanban impose un défilement horizontal par colonne, peu adapté au
  // tactile — la Liste (une seule colonne) est le point de départ naturel
  // sur téléphone. Lu une seule fois au montage : si l'utilisateur change de
  // vue ensuite, on ne le contredit pas à chaque re-render.
  const [view, setView] = useState<PortfolioView>(() => (isMobile ? 'list' : 'kanban'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<DealsFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    late: searchParams.get('late') === 'true',
  });
  const dealId = searchParams.get('dealId');
  const navigate = useNavigate();

  const { data, isLoading } = useDeals(filters);
  const deals = data?.items ?? [];
  const { data: kpis } = useDealKpis();
  const exportReport = useExportPortfolioReport();
  const exportReportPdf = useExportPortfolioReportPdf();
  const canValidate = useCanValidate();

  // Sur mobile, le tiroir de synthèse ajoute un écran intermédiaire avant le
  // dossier complet ("Dossier complet" à re-taper dedans) — sur un écran déjà
  // étroit, autant ouvrir directement la fiche complète en un seul geste.
  const openDeal = (id: string) =>
    isMobile ? navigate(`/deals/${id}`) : setSearchParams((prev) => ({ ...Object.fromEntries(prev), dealId: id }));
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
    void exportToExcel(`atlas-portefeuille-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Portefeuille', rows);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Portefeuille"
        description="Toutes les opérations de votre organisation."
        actions={
          <>
            {/* Export/rapports : utiles surtout à un poste de travail — repliés hors mobile
                pour ne pas encombrer l'écran d'un bouton d'action principal ("Nouvelle opération"). */}
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={deals.length === 0}>
                <Download className="h-3.5 w-3.5" /> Exporter
              </Button>
              <Button variant="outline" size="sm" disabled={!kpis || exportReportPdf.isPending} onClick={() => exportReportPdf.mutate()}>
                {exportReportPdf.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} Rapport PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={exportReport.isPending || !canValidate}
                title={canValidate ? undefined : 'Réservé aux analystes et administrateurs'}
                onClick={() =>
                  exportReport.mutate(undefined, {
                    onSuccess: (report) => exportToJson(`atlas-rapport-portefeuille-${new Date().toISOString().slice(0, 10)}.json`, report),
                  })
                }
              >
                {exportReport.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Rapport JSON
              </Button>
            </div>
            <CreateDealDialog />
          </>
        }
      />

      {/* Synthèse chiffrée du portefeuille : dense et utile, mais elle repousse la liste des
          opérations loin sous la ligne de flottaison sur un téléphone. Repliée par défaut sur
          mobile (l'utilisateur l'ouvre d'un geste s'il la veut) ; toujours ouverte sur desktop. */}
      <details className="group" open={!isMobile}>
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden md:hidden">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          Synthèse du portefeuille
        </summary>
        <div className="flex flex-col gap-5 pt-3 md:pt-0">
          <KpiBar />
          <PortfolioOverviewCard />
        </div>
      </details>

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
