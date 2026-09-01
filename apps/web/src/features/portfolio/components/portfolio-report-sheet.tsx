import type { DealKpis } from '@/types';
import { DEAL_TYPE_LABELS, DEAL_SURVEILLANCE_STATUS_LABELS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';

const TIER_ORDER = ['FAIBLE', 'SOUS_SURVEILLANCE', 'ELEVE', 'CRITIQUE', 'NON_CALCULE'] as const;
const TIER_LABEL: Record<string, string> = { ...DEAL_SURVEILLANCE_STATUS_LABELS, NON_CALCULE: 'Non calculé' };

/**
 * Rendu uniquement à l'impression (spec ATLAS v2, A.11) — un rapport
 * portefeuille pensé pour un board/investisseur, même technique
 * zero-dépendance que DealPrintSheet (`hidden print:block` + window.print()).
 * Réutilise les agrégats déjà chargés par la page Portefeuille (kpis +
 * compteur d'actions en retard du cockpit), aucun appel réseau propre.
 */
export function PortfolioReportSheet({ kpis, overdueTasks }: { kpis: DealKpis; overdueTasks: { total: number; urgent: number } }) {
  const riskRows = TIER_ORDER.map((tier) => ({ tier, crd: kpis.exposureByRiskTier[tier] ?? 0 })).filter((r) => r.crd > 0);
  const typeRows = Object.entries(kpis.exposureByType).filter(([, crd]) => crd > 0);

  return (
    <div className="hidden print:block print:bg-white print:p-6 print:text-black">
      <header className="mb-4 flex items-start justify-between border-b border-black pb-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-black/60">Atlas Capital</p>
          <h1 className="text-2xl font-semibold">Rapport portefeuille</h1>
        </div>
        <div className="text-right text-xs text-black/60">
          <p>Généré le {formatDate(new Date().toISOString())}</p>
          <p>{kpis.activeDeals} dossier{kpis.activeDeals > 1 ? 's' : ''} actif{kpis.activeDeals > 1 ? 's' : ''}</p>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-black/60">Montant cible cumulé</p>
          <p className="text-lg font-semibold">{formatCurrency(kpis.totalAum)}</p>
        </div>
        <div>
          <p className="text-xs text-black/60">Capital restant dû cumulé</p>
          <p className="text-lg font-semibold">{formatCurrency(kpis.totalCrd)}</p>
        </div>
        <div>
          <p className="text-xs text-black/60">Taux moyen</p>
          <p className="text-lg font-semibold">{kpis.averageInterestRate}%</p>
        </div>
        <div>
          <p className="text-xs text-black/60">Actions en retard</p>
          <p className="text-lg font-semibold">
            {overdueTasks.total}
            {overdueTasks.urgent > 0 && <span className="ml-1 text-sm font-normal text-black/60">dont {overdueTasks.urgent} urgente{overdueTasks.urgent > 1 ? 's' : ''}</span>}
          </p>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60">Distribution par palier de risque</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1 pr-2 font-medium">Palier</th>
              <th className="py-1 font-medium text-right">CRD exposé</th>
            </tr>
          </thead>
          <tbody>
            {riskRows.map((r) => (
              <tr key={r.tier} className="border-b border-black/10">
                <td className="py-1 pr-2">{TIER_LABEL[r.tier] ?? r.tier}</td>
                <td className="py-1 text-right">{formatCurrency(r.crd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[10px] text-black/40">
          Stress test — {kpis.stressTest.assumedDefaultRate * 100}% des dossiers "Élevé" en défaut : perte potentielle {formatCurrency(kpis.stressTest.potentialLoss)}.
        </p>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-x-8">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60">Concentration par opérateur (top 5)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1 pr-2 font-medium">Opérateur</th>
                <th className="py-1 font-medium text-right">CRD</th>
              </tr>
            </thead>
            <tbody>
              {kpis.topOperatorConcentration.map((op, i) => (
                <tr key={op.porteurSiren ?? `unknown-${i}`} className="border-b border-black/10">
                  <td className="py-1 pr-2">{op.porteurSociete ?? 'Non renseigné'} ({op.dealCount})</td>
                  <td className="py-1 text-right">{formatCurrency(op.crd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60">Exposition géographique (top 8)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1 pr-2 font-medium">Ville</th>
                <th className="py-1 font-medium text-right">CRD</th>
              </tr>
            </thead>
            <tbody>
              {kpis.exposureByCity.map((c) => (
                <tr key={c.city} className="border-b border-black/10">
                  <td className="py-1 pr-2">{c.city}</td>
                  <td className="py-1 text-right">{formatCurrency(c.crd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60">Exposition par typologie</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1 pr-2 font-medium">Typologie</th>
              <th className="py-1 font-medium text-right">CRD</th>
            </tr>
          </thead>
          <tbody>
            {typeRows.map(([type, crd]) => (
              <tr key={type} className="border-b border-black/10">
                <td className="py-1 pr-2">{DEAL_TYPE_LABELS[type as keyof typeof DEAL_TYPE_LABELS] ?? type}</td>
                <td className="py-1 text-right">{formatCurrency(crd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-4 text-[10px] text-black/40">
        Atlas Capital — document interne, non contractuel. ATLAS n'est pas un prestataire de services d'investissement (PSI) et ne fournit
        aucun conseil en investissement réglementé.
      </footer>
    </div>
  );
}
