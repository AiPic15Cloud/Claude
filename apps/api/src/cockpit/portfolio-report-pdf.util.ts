import { escapeHtml, money, formatDate, wrapPrintDocument } from '../pdf-export/print-html.util';
import type { CockpitService } from './cockpit.service';

type PortfolioReport = Awaited<ReturnType<CockpitService['exportPortfolioReport']>>;
type DealKpis = PortfolioReport['kpis'];

const TIER_ORDER = ['FAIBLE', 'SOUS_SURVEILLANCE', 'ELEVE', 'CRITIQUE', 'NON_CALCULE'] as const;
const DEAL_SURVEILLANCE_STATUS_LABELS: Record<string, string> = {
  FAIBLE: 'Faible',
  SOUS_SURVEILLANCE: 'Sous surveillance',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
  OUTPERFORMING: 'Faible (historique)',
  RECOVERY: 'Sous surveillance (historique)',
  NON_CALCULE: 'Non calculé',
};
const DEAL_TYPE_LABELS: Record<string, string> = {
  PROMOTION_IMMOBILIERE: 'Promotion immobilière',
  DIVISION_PARCELLAIRE: 'Division parcellaire',
  DIVISION_FONCIERE: 'Division foncière',
  MISE_EN_COPROPRIETE: 'Mise en copropriété',
  AMENAGEMENT_FONCIER: 'Aménagement foncier',
  MARCHAND_DE_BIENS_AVEC_TRAVAUX: 'Marchand de biens avec travaux',
  MARCHAND_DE_BIENS_SANS_TRAVAUX: 'Marchand de biens sans travaux',
  REFINANCEMENT_FONDS_PROPRES: 'Refinancement des fonds propres',
  REFINANCEMENT_ACTIF: "Refinancement d'actif",
  REFINANCEMENT_STOCK: 'Refinancement de stock',
};

/** Port serveur exact de `portfolio-report-sheet.tsx`. */
export function buildPortfolioReportHtml(kpis: DealKpis, overdueTasks: { total: number; urgent: number }): string {
  const riskRows = TIER_ORDER.map((tier) => ({ tier, crd: (kpis.exposureByRiskTier as Record<string, number>)[tier] ?? 0 })).filter((r) => r.crd > 0);
  const typeRows = Object.entries(kpis.exposureByType as Record<string, number>).filter(([, crd]) => crd > 0);

  const body = `
    <header class="doc-header" style="display:flex; align-items:flex-start; justify-content:space-between;">
      <div>
        <p class="doc-meta">Atlas Capital</p>
        <h1>Rapport portefeuille</h1>
      </div>
      <div class="small muted" style="text-align:right;">
        <p>Généré le ${formatDate(new Date())}</p>
        <p>${kpis.activeDeals} dossier${kpis.activeDeals > 1 ? 's' : ''} actif${kpis.activeDeals > 1 ? 's' : ''}</p>
      </div>
    </header>

    <section class="grid" style="grid-template-columns:repeat(4,1fr);">
      <div><p class="small muted">Montant cible cumulé</p><p style="font-size:16px; font-weight:600;">${money(kpis.totalAum)}</p></div>
      <div><p class="small muted">Capital restant dû cumulé</p><p style="font-size:16px; font-weight:600;">${money(kpis.totalCrd)}</p></div>
      <div><p class="small muted">Taux moyen</p><p style="font-size:16px; font-weight:600;">${kpis.averageInterestRate}%</p></div>
      <div><p class="small muted">Actions en retard</p><p style="font-size:16px; font-weight:600;">${overdueTasks.total}${overdueTasks.urgent > 0 ? ` <span class="small muted" style="font-weight:400;">dont ${overdueTasks.urgent} urgente${overdueTasks.urgent > 1 ? 's' : ''}</span>` : ''}</p></div>
    </section>

    <section>
      <h2>Distribution par palier de risque</h2>
      <table>
        <thead><tr><th>Palier</th><th class="num">CRD exposé</th></tr></thead>
        <tbody>
          ${riskRows.map((r) => `<tr><td>${escapeHtml(DEAL_SURVEILLANCE_STATUS_LABELS[r.tier] ?? r.tier)}</td><td class="num">${money(r.crd)}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="small muted" style="margin-top:4px;">Stress test — ${kpis.stressTest.assumedDefaultRate * 100}% des dossiers "Élevé" en défaut : perte potentielle ${money(kpis.stressTest.potentialLoss)}.</p>
    </section>

    <section class="grid grid-2">
      <div>
        <h2>Concentration par opérateur (top 5)</h2>
        <table>
          <thead><tr><th>Opérateur</th><th class="num">CRD</th></tr></thead>
          <tbody>
            ${kpis.topOperatorConcentration
              .map((op) => `<tr><td>${escapeHtml(op.porteurSociete ?? 'Non renseigné')} (${op.dealCount})</td><td class="num">${money(op.crd)}</td></tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
      <div>
        <h2>Exposition géographique (top 8)</h2>
        <table>
          <thead><tr><th>Ville</th><th class="num">CRD</th></tr></thead>
          <tbody>
            ${kpis.exposureByCity.map((c) => `<tr><td>${escapeHtml(c.city)}</td><td class="num">${money(c.crd)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Exposition par typologie</h2>
      <table>
        <thead><tr><th>Typologie</th><th class="num">CRD</th></tr></thead>
        <tbody>
          ${typeRows.map(([type, crd]) => `<tr><td>${escapeHtml(DEAL_TYPE_LABELS[type] ?? type)}</td><td class="num">${money(crd)}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>

    <footer class="doc-footer">
      Atlas Capital — document interne, non contractuel. ATLAS n'est pas un prestataire de services d'investissement (PSI) et ne fournit aucun conseil en investissement réglementé.
    </footer>
  `;

  return wrapPrintDocument('Rapport portefeuille', body);
}
