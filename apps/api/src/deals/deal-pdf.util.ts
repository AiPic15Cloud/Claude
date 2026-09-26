import { escapeHtml, text, money, formatDate, wrapPrintDocument } from '../pdf-export/print-html.util';
import type { DealsService } from './deals.service';
import type { GuaranteesService } from '../guarantees/guarantees.service';

type DealDetail = Awaited<ReturnType<DealsService['findOne']>>;
type GuaranteeRow = Awaited<ReturnType<GuaranteesService['list']>>[number];

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
const DEAL_STAGE_LABELS: Record<string, string> = {
  SOURCING: 'Sourcing',
  ANALYSE: 'Analyse',
  COMITE: 'Comité',
  MONTAGE: 'Montage',
  COLLECTE: 'Collecte',
  FINANCE: 'Financé',
  SUIVI: 'Suivi',
  REMBOURSE: 'Remboursé',
  DEFAUT: 'Défaut',
};
const GUARANTEE_TYPE_LABELS: Record<string, string> = {
  HYPOTHEQUE: 'Hypothèque',
  FIDUCIE: 'Fiducie',
  CAUTION: 'Caution',
  GAGE: 'Gage',
  NANTISSEMENT: 'Nantissement',
  PRIVILEGE: 'Privilège',
  AUTRE: 'Autre',
};
const GUARANTEE_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Active', RELEASED: 'Levée', DEFAULTED: 'En défaut' };

/**
 * Port serveur exact de `deal-print-sheet.tsx` — même contenu, même
 * doctrine "—" pour toute valeur absente. Voir prequal-pdf.util.ts pour le
 * contexte général (pourquoi ce rendu est désormais côté serveur : window.print()
 * ne fonctionne quasiment pas sur Chrome Android).
 */
export function buildDealPdfHtml(deal: DealDetail, guarantees: GuaranteeRow[]): string {
  const locationLine = deal.city ? `${deal.address ? `${deal.address}, ` : ''}${deal.postcode ?? ''} ${deal.city}` : null;

  const guaranteesHtml =
    guarantees.length === 0
      ? `<p class="small muted">Aucune garantie enregistrée.</p>`
      : `<table>
          <thead><tr><th>Type</th><th>Description</th><th class="num">Montant</th><th>Rang</th><th>Statut</th><th>Échéance</th></tr></thead>
          <tbody>
            ${guarantees
              .map(
                (g) => `<tr>
                  <td>${escapeHtml(GUARANTEE_TYPE_LABELS[g.type] ?? g.type)}</td>
                  <td>${text(g.description)}</td>
                  <td class="num">${money(g.amount)}</td>
                  <td>${g.rank}</td>
                  <td>${escapeHtml(GUARANTEE_STATUS_LABELS[g.status] ?? g.status)}</td>
                  <td>${g.endDate ? formatDate(g.endDate) : '—'}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const body = `
    <header class="doc-header" style="display:flex; align-items:flex-start; justify-content:space-between;">
      <div>
        <p class="doc-meta">${escapeHtml(deal.reference)} · ${escapeHtml(DEAL_TYPE_LABELS[deal.type] ?? deal.type)}</p>
        <h1>${escapeHtml(deal.name)}</h1>
        ${locationLine ? `<p class="small muted">${escapeHtml(locationLine)}</p>` : ''}
      </div>
      <div class="small muted" style="text-align:right;">
        <p>Fiche générée le ${formatDate(new Date())}</p>
        <p>Étape : ${escapeHtml(DEAL_STAGE_LABELS[deal.stage] ?? deal.stage)}</p>
      </div>
    </header>

    <section class="grid grid-3" style="grid-template-columns:repeat(4,1fr);">
      <div><p class="small muted">Montant cible</p><p style="font-size:16px; font-weight:600;">${money(deal.amountTarget)}</p></div>
      <div><p class="small muted">Collecté</p><p style="font-size:16px; font-weight:600;">${money(deal.amountRaised)}</p></div>
      <div><p class="small muted">Taux</p><p style="font-size:16px; font-weight:600;">${deal.interestRate != null ? `${deal.interestRate}%` : '—'}</p></div>
      <div><p class="small muted">Score de risque</p><p style="font-size:16px; font-weight:600;">${deal.riskScore ?? '—'}</p></div>
    </section>

    <section class="grid grid-2 small">
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding:4px 0;"><span class="muted">Durée</span><span>${deal.durationMonths != null ? `${deal.durationMonths} mois` : '—'}</span></div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding:4px 0;"><span class="muted">Fees</span><span>${deal.feesRate != null ? `${deal.feesRate}%` : '—'}</span></div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding:4px 0;"><span class="muted">Date de début</span><span>${deal.startDate ? formatDate(deal.startDate) : '—'}</span></div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding:4px 0;"><span class="muted">Échéance</span><span>${deal.endDate ? formatDate(deal.endDate) : '—'}</span></div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding:4px 0;"><span class="muted">Porteur</span><span>${text(deal.porteurNom || deal.porteurSociete)}</span></div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding:4px 0;"><span class="muted">Statut recouvrement</span><span>${deal.repaid ? 'Remboursé' : escapeHtml(String(deal.recoveryStatus))}</span></div>
    </section>

    ${deal.description ? `<section><h2>Description</h2><p>${escapeHtml(deal.description)}</p></section>` : ''}

    <section>
      <h2>Garanties (${guarantees.length})</h2>
      ${guaranteesHtml}
    </section>

    <footer class="doc-footer">Atlas Capital — document interne, non contractuel.</footer>
  `;

  return wrapPrintDocument(`${deal.name} — Fiche dossier`, body);
}
