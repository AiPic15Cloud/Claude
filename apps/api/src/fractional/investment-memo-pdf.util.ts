import { escapeHtml, money, pct, wrapPrintDocument } from '../pdf-export/print-html.util';
import type { FractionalProjectsService } from './fractional-projects.service';

type ProjectDetail = Awaited<ReturnType<FractionalProjectsService['findOne']>>;
type Synthese = Awaited<ReturnType<FractionalProjectsService['computeSynthese']>>;
type ICRecommendation = Awaited<ReturnType<FractionalProjectsService['computeICRecommendationForProject']>>;
type LegalReview = Awaited<ReturnType<FractionalProjectsService['computeLegalReview']>>[number];

const FRACTIONAL_PROJECT_STATUS_LABELS: Record<string, string> = {
  ANALYSE: 'Analyse',
  STRUCTURATION: 'Structuration',
  VALIDATION_PLATEFORME: 'Validation plateforme',
  COLLECTE: 'Collecte',
  ACQUISITION: 'Acquisition',
  EXPLOITATION: 'Exploitation',
  SORTIE: 'Sortie',
  REFUSE: 'Refusé',
  ABANDONNE: 'Abandonné',
};
const IC_DECISION_STATUS_LABELS: Record<string, string> = {
  APPROVE: 'Approuvé',
  APPROVE_SUBJECT_TO_CONDITIONS: 'Approuvé sous conditions',
  RESTRUCTURE: 'À restructurer',
  HOLD: 'En attente',
  DECLINE: 'Refusé',
};
const ELIGIBILITY_VERDICT_LABELS: Record<string, string> = { ELIGIBLE: 'Éligible', MARGINAL: 'Marginal', INELIGIBLE: 'Non éligible' };
const LEASE_SECURITY_STATUS_LABELS: Record<string, string> = {
  SECURED: 'Sécurisé',
  WATCH: 'À surveiller',
  SECURE_BEFORE_ACQUISITION: 'À sécuriser avant acquisition',
  EXCLUDE_FROM_SECURED_YIELD: 'Exclu du rendement sécurisé',
};

/** Port serveur exact de `investment-memo-print-sheet.tsx`. */
export function buildInvestmentMemoHtml(
  project: ProjectDetail,
  synthese: Synthese | undefined,
  icRecommendation: ICRecommendation | undefined,
  legalReviews: LegalReview[] | undefined,
): string {
  const flaggedLeases = (legalReviews ?? []).filter((r) => r.worstSeverity === 'ALERT' || r.worstSeverity === 'CRITIQUE');

  const icSection = icRecommendation
    ? `<section>
        <h2>Recommandation IC</h2>
        <p style="font-weight:500;">${escapeHtml(IC_DECISION_STATUS_LABELS[icRecommendation.status] ?? icRecommendation.status)}</p>
        <p>${escapeHtml(icRecommendation.recommendation)}</p>
        ${icRecommendation.hardStops.length > 0 ? `<p><strong>Hard stops : </strong>${escapeHtml(icRecommendation.hardStops.join(' · '))}</p>` : ''}
        ${icRecommendation.conditions.length > 0 ? `<p><strong>Conditions : </strong>${escapeHtml(icRecommendation.conditions.join(' · '))}</p>` : ''}
      </section>`
    : '';

  const returnsSection = synthese
    ? `<section>
        <h2>Rendements</h2>
        <table>
          <tbody>
            <tr><td>Gross Yield</td><td class="num">${pct(synthese.base.grossYieldPct)}</td><td>Secured Net Yield</td><td class="num">${pct(synthese.base.securedNetYieldPct)}</td></tr>
            <tr><td>Investor Net Yield</td><td class="num">${pct(synthese.base.investorNetYieldPct)}</td><td>Stressed Net Yield</td><td class="num">${pct(synthese.stressed.investorNetYieldPct)}</td></tr>
            <tr><td>IRR</td><td class="num">${pct(synthese.base.irrPct)}</td><td>Equity Multiple</td><td class="num">${synthese.base.equityMultiple ? `${synthese.base.equityMultiple.toFixed(2)}x` : '—'}</td></tr>
            <tr><td>Hurdle plateforme</td><td class="num">${pct(synthese.hurdlePct)}</td><td>Éligibilité (technique)</td><td class="num">${escapeHtml(ELIGIBILITY_VERDICT_LABELS[synthese.eligibility.verdict] ?? synthese.eligibility.verdict)}</td></tr>
          </tbody>
        </table>
        ${synthese.capexDataMissing ? `<p style="font-weight:500;">CAPEX non renseigné — aucune ligne saisie, le cash-flow n'est pas stressé sur ce poste.</p>` : ''}
      </section>`
    : '';

  const dcfSection = synthese
    ? `<section>
        <h2>Valorisation DCF</h2>
        <p>Taux d'actualisation ${pct(synthese.dcfValuation.discountRatePct, 1)} · VA des cash-flows ${money(synthese.dcfValuation.presentValueOfCashFlows)} · VA de la valeur terminale ${money(synthese.dcfValuation.presentValueOfTerminalValue)} (sortie retenue ${money(synthese.dcfValuation.terminalValue)})</p>
        <p style="font-weight:500;">Valeur DCF de l'actif : ${money(synthese.dcfValuation.totalValue)}</p>
      </section>`
    : '';

  const cashflowSection =
    synthese && synthese.base.yearlyModel.length > 0
      ? `<section>
          <h2>Cash-Flow annuel</h2>
          <table>
            <thead><tr><th>Année</th><th class="num">NOI</th><th class="num">CAPEX</th><th class="num">CF distribuable</th><th class="num">Distribution investisseur</th></tr></thead>
            <tbody>
              ${synthese.base.yearlyModel
                .map(
                  (y) => `<tr>
                    <td>${y.year}</td>
                    <td class="num">${money(y.noi)}</td>
                    <td class="num">${y.capex > 0 ? money(y.capex) : synthese.capexDataMissing ? 'Non renseigné' : '—'}</td>
                    <td class="num">${money(y.distributableCashFlow)}</td>
                    <td class="num">${money(y.investorDistribution)}</td>
                  </tr>`,
                )
                .join('')}
              <tr style="font-weight:500;">
                <td>Sortie</td>
                <td class="num" colspan="2">Produit net ${money(synthese.base.terminalProceeds.netSaleProceeds)}</td>
                <td class="num" colspan="2">Retour investisseur ${money(synthese.base.terminalProceeds.investorTerminalProceeds)}</td>
              </tr>
            </tbody>
          </table>
        </section>`
      : '';

  const legalSection =
    flaggedLeases.length > 0
      ? `<section>
          <h2>Recommandations juridiques</h2>
          <table>
            <thead><tr><th>Locataire</th><th>Sévérité</th><th>Points d'attention</th></tr></thead>
            <tbody>
              ${flaggedLeases
                .map(
                  (r) => `<tr>
                    <td>${escapeHtml(r.tenantName)}</td>
                    <td>${escapeHtml(r.worstSeverity)}</td>
                    <td>${escapeHtml(r.recommendations.map((rec) => rec.message).join(' · '))}</td>
                  </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </section>`
      : '';

  const leaseSection = synthese
    ? `<section>
        <h2>Locatif</h2>
        <p>WALB ${synthese.base.leaseSecurity.walbYears?.toFixed(1) ?? '—'} ans · WALT ${synthese.base.leaseSecurity.waltYears?.toFixed(1) ?? '—'} ans · Secured Rent ${pct(synthese.base.leaseSecurity.securedRentPct, 1)}</p>
        <table>
          <thead><tr><th>Locataire</th><th class="num">Poids</th><th class="num">Statut</th></tr></thead>
          <tbody>
            ${synthese.base.leaseSecurity.assessments
              .map(
                (a) => `<tr>
                  <td>${escapeHtml(a.tenantName)}</td>
                  <td class="num">${a.weightPct.toFixed(1)}%</td>
                  <td class="num">${escapeHtml(LEASE_SECURITY_STATUS_LABELS[a.securityStatus] ?? a.securityStatus)}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </section>`
    : '';

  const sourcesUsesSection = project.sourcesUses
    ? `<section>
        <h2>Sources &amp; Uses</h2>
        <p>Prix net vendeur ${money(project.sourcesUses.prixNetVendeur)} · Collecte ${money(project.sourcesUses.collecteMontant)}${Number(project.sourcesUses.sponsorEquity) > 0 ? ` · Sponsor equity ${money(project.sourcesUses.sponsorEquity)}` : ''}</p>
      </section>`
    : '';

  const body = `
    <header class="doc-header">
      <p class="doc-meta">${escapeHtml(project.reference)} · ${escapeHtml(FRACTIONAL_PROJECT_STATUS_LABELS[project.status] ?? project.status)}</p>
      <h1>Investment Memo — ${escapeHtml(project.name)}</h1>
      ${project.city ? `<p class="small muted">${escapeHtml(project.city)}</p>` : ''}
    </header>

    ${icSection}
    ${returnsSection}
    ${dcfSection}
    ${cashflowSection}
    ${legalSection}
    ${leaseSection}
    ${sourcesUsesSection}

    <footer class="doc-footer">
      Document généré par ATLAS à partir des données du dossier Fractionné — brouillon compilé, la décision d'engagement reste de la responsabilité du comité/analyste habilité.
    </footer>
  `;

  return wrapPrintDocument(`Investment Memo — ${project.name}`, body);
}
