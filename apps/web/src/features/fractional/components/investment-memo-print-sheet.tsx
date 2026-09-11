import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/format';
import {
  FRACTIONAL_PROJECT_STATUS_LABELS,
  IC_DECISION_STATUS_LABELS,
  LEASE_SECURITY_STATUS_LABELS,
  type FractionalProjectDetail,
  type FractionalSynthese,
  type ICRecommendation,
  type LeaseLegalReview,
} from '@/types';

function pct(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(digits)} %`;
}

/**
 * Investment Memo (spec V3 §0/§25/§27, P2 Industrialisation) — même
 * doctrine d'impression que InvestmentNotePrintSheet côté Deal (portail
 * vers document.body pour échapper au print:hidden d'un ancêtre), mais
 * entièrement piloté par les données déjà calculées (Synthèse, Deal
 * Economics, recommandation IC) plutôt que par du texte libre : un memo
 * généré à partir des chiffres du dossier, pas rédigé.
 */
export function InvestmentMemoPrintSheet({
  project,
  synthese,
  icRecommendation,
  legalReviews,
}: {
  project: FractionalProjectDetail;
  synthese?: FractionalSynthese;
  icRecommendation?: ICRecommendation;
  legalReviews?: LeaseLegalReview[];
}) {
  const flaggedLeases = (legalReviews ?? []).filter((r) => r.worstSeverity === 'ALERT' || r.worstSeverity === 'CRITIQUE');
  return createPortal(
    <div className="hidden print:block print:bg-white print:p-6 print:text-black">
      <header className="mb-4 border-b border-black pb-2">
        <p className="text-xs uppercase tracking-wide text-black/60">
          {project.reference} · {FRACTIONAL_PROJECT_STATUS_LABELS[project.status]}
        </p>
        <h1 className="text-2xl font-semibold">Investment Memo — {project.name}</h1>
        {project.city && <p className="text-sm text-black/70">{project.city}</p>}
      </header>

      {icRecommendation && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Recommandation IC</h2>
          <p className="text-sm font-medium">{IC_DECISION_STATUS_LABELS[icRecommendation.status]}</p>
          <p className="text-sm">{icRecommendation.recommendation}</p>
          {icRecommendation.hardStops.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="font-medium">Hard stops : </span>
              {icRecommendation.hardStops.join(' · ')}
            </p>
          )}
          {icRecommendation.conditions.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="font-medium">Conditions : </span>
              {icRecommendation.conditions.join(' · ')}
            </p>
          )}
        </section>
      )}

      {synthese && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Rendements</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-0.5">Gross Yield</td>
                <td className="py-0.5 text-right">{pct(synthese.base.grossYieldPct)}</td>
                <td className="py-0.5">Secured Net Yield</td>
                <td className="py-0.5 text-right">{pct(synthese.base.securedNetYieldPct)}</td>
              </tr>
              <tr>
                <td className="py-0.5">Investor Net Yield</td>
                <td className="py-0.5 text-right">{pct(synthese.base.investorNetYieldPct)}</td>
                <td className="py-0.5">Stressed Net Yield</td>
                <td className="py-0.5 text-right">{pct(synthese.stressed.investorNetYieldPct)}</td>
              </tr>
              <tr>
                <td className="py-0.5">IRR</td>
                <td className="py-0.5 text-right">{pct(synthese.base.irrPct)}</td>
                <td className="py-0.5">Equity Multiple</td>
                <td className="py-0.5 text-right">{synthese.base.equityMultiple ? `${synthese.base.equityMultiple.toFixed(2)}x` : '—'}</td>
              </tr>
              <tr>
                <td className="py-0.5">Hurdle plateforme</td>
                <td className="py-0.5 text-right">{pct(synthese.hurdlePct)}</td>
                <td className="py-0.5">Verdict</td>
                <td className="py-0.5 text-right">{synthese.eligibility.verdict}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {synthese && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Valorisation DCF</h2>
          <p className="text-sm">
            Taux d'actualisation {pct(synthese.dcfValuation.discountRatePct, 1)} · VA des cash-flows {formatCurrency(synthese.dcfValuation.presentValueOfCashFlows)} · VA
            de la valeur terminale {formatCurrency(synthese.dcfValuation.presentValueOfTerminalValue)} (sortie retenue {formatCurrency(synthese.dcfValuation.terminalValue)})
          </p>
          <p className="text-sm font-medium">Valeur DCF de l'actif : {formatCurrency(synthese.dcfValuation.totalValue)}</p>
        </section>
      )}

      {synthese && synthese.base.yearlyModel.length > 0 && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Cash-Flow annuel</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/30 text-left">
                <th className="py-0.5">Année</th>
                <th className="py-0.5 text-right">NOI</th>
                <th className="py-0.5 text-right">CAPEX</th>
                <th className="py-0.5 text-right">CF distribuable</th>
                <th className="py-0.5 text-right">Distribution investisseur</th>
              </tr>
            </thead>
            <tbody>
              {synthese.base.yearlyModel.map((y) => (
                <tr key={y.year}>
                  <td className="py-0.5">{y.year}</td>
                  <td className="py-0.5 text-right">{formatCurrency(y.noi)}</td>
                  <td className="py-0.5 text-right">{y.capex > 0 ? formatCurrency(y.capex) : '—'}</td>
                  <td className="py-0.5 text-right">{formatCurrency(y.distributableCashFlow)}</td>
                  <td className="py-0.5 text-right">{formatCurrency(y.investorDistribution)}</td>
                </tr>
              ))}
              <tr className="border-t border-black/30 font-medium">
                <td className="py-0.5">Sortie</td>
                <td className="py-0.5 text-right" colSpan={2}>
                  Produit net {formatCurrency(synthese.base.terminalProceeds.netSaleProceeds)}
                </td>
                <td className="py-0.5 text-right" colSpan={2}>
                  Retour investisseur {formatCurrency(synthese.base.terminalProceeds.investorTerminalProceeds)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {flaggedLeases.length > 0 && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Recommandations juridiques</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/30 text-left">
                <th className="py-0.5">Locataire</th>
                <th className="py-0.5">Sévérité</th>
                <th className="py-0.5">Points d'attention</th>
              </tr>
            </thead>
            <tbody>
              {flaggedLeases.map((r) => (
                <tr key={r.leaseId}>
                  <td className="py-0.5 align-top">{r.tenantName}</td>
                  <td className="py-0.5 align-top">{r.worstSeverity}</td>
                  <td className="py-0.5">{r.recommendations.map((rec) => rec.message).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {synthese && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Locatif</h2>
          <p className="text-sm">
            WALB {synthese.base.leaseSecurity.walbYears?.toFixed(1) ?? '—'} ans · WALT {synthese.base.leaseSecurity.waltYears?.toFixed(1) ?? '—'} ans · Secured Rent{' '}
            {pct(synthese.base.leaseSecurity.securedRentPct, 1)}
          </p>
          <table className="mt-1 w-full text-sm">
            <thead>
              <tr className="border-b border-black/30 text-left">
                <th className="py-0.5">Locataire</th>
                <th className="py-0.5 text-right">Poids</th>
                <th className="py-0.5 text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {synthese.base.leaseSecurity.assessments.map((a) => (
                <tr key={a.leaseId}>
                  <td className="py-0.5">{a.tenantName}</td>
                  <td className="py-0.5 text-right">{a.weightPct.toFixed(1)}%</td>
                  <td className="py-0.5 text-right">{LEASE_SECURITY_STATUS_LABELS[a.securityStatus]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {project.sourcesUses && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Sources & Uses</h2>
          <p className="text-sm">
            Prix net vendeur {formatCurrency(project.sourcesUses.prixNetVendeur)} · Collecte {formatCurrency(project.sourcesUses.collecteMontant)}
            {project.sourcesUses.sponsorEquity > 0 && <> · Sponsor equity {formatCurrency(project.sourcesUses.sponsorEquity)}</>}
          </p>
        </section>
      )}

      <p className="mt-6 border-t border-black pt-2 text-[10px] text-black/60">
        Document généré par ATLAS à partir des données du dossier Fractionné — brouillon compilé, la décision
        d'engagement reste de la responsabilité du comité/analyste habilité.
      </p>
    </div>,
    document.body,
  );
}
