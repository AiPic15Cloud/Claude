import { createPortal } from 'react-dom';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  PREQUALIFICATION_STATUS_LABELS,
  PREQUALIFICATION_ORIENTATION_LABELS,
  PREQUALIFICATION_CONFIDENCE_LABELS,
  FINDING_CATEGORY_LABELS,
  type PrequalificationCaseDetail,
} from '@/types';

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(1)} %`;
}

/**
 * Export pré-comité (spec §3, §21 P1) — "revue en 90 secondes" : même
 * doctrine que InvestmentMemoPrintSheet côté Fractionné, entièrement
 * généré depuis les données déjà calculées du dossier (jamais du texte
 * libre récrit), portail vers document.body pour échapper à un ancêtre
 * print:hidden, déclenché par window.print().
 */
export function PrequalMemoPrintSheet({ prequalCase }: { prequalCase: PrequalificationCaseDetail }) {
  const strengths = prequalCase.findings.filter((f) => f.severity === 'POSITIVE').slice(0, 3);
  const risks = [...prequalCase.findings]
    .filter((f) => f.severity === 'BLOCKING' || f.severity === 'MATERIAL')
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'BLOCKING' ? -1 : 1))
    .slice(0, 3);
  const dealbreaker = prequalCase.findings.find((f) => f.severity === 'BLOCKING' && (f.reviewStatus === 'PENDING' || f.reviewStatus === 'ACCEPTED'));
  const openQuestions = prequalCase.questions.filter((q) => !q.answer);

  const f = prequalCase.financial;

  return createPortal(
    <div className="hidden print:block print:bg-white print:p-6 print:text-black">
      <header className="mb-4 border-b border-black pb-2">
        <p className="text-xs uppercase tracking-wide text-black/60">
          {PREQUALIFICATION_STATUS_LABELS[prequalCase.status]} · Version {prequalCase.version} · {formatDate(prequalCase.updatedAt)}
        </p>
        <h1 className="text-2xl font-semibold">Préqualification — {prequalCase.name}</h1>
        <p className="text-sm text-black/70">
          {prequalCase.entryChannel ? `Canal : ${prequalCase.entryChannel}` : ''} {prequalCase.introducer ? `· Apporteur : ${prequalCase.introducer}` : ''}
          {prequalCase.assignedAnalyst ? ` · Analyste : ${prequalCase.assignedAnalyst.firstName} ${prequalCase.assignedAnalyst.lastName}` : ''}
        </p>
        <div className="mt-2 flex gap-4 text-sm">
          <span>
            <strong>Orientation :</strong> {prequalCase.orientation ? PREQUALIFICATION_ORIENTATION_LABELS[prequalCase.orientation] : '—'}
          </span>
          <span>
            <strong>Confiance :</strong> {prequalCase.confidence ? PREQUALIFICATION_CONFIDENCE_LABELS[prequalCase.confidence] : '—'}
          </span>
        </div>
      </header>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Synthèse décisionnelle</h2>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <span>Montant recherché : {f?.amountRequested != null ? formatCurrency(f.amountRequested) : '—'}</span>
          <span>Coût de revient : {f?.coutDeRevient != null ? formatCurrency(f.coutDeRevient) : '—'}</span>
          <span>Chiffre d'affaires : {f?.chiffreAffaires != null ? formatCurrency(f.chiffreAffaires) : '—'}</span>
          <span>Marge annoncée : {pct(f?.declaredMarginPct)}</span>
          <span>Marge recalculée : {f?.margeRecalculee != null ? formatCurrency(f.margeRecalculee) : '—'} ({pct(f?.margeRecalculeePct)})</span>
          <span>Apport prouvé : {f?.provenEquity != null ? formatCurrency(f.provenEquity) : '—'}</span>
          <span>LTA : {pct(f?.ltaPct)}</span>
          <span>LTC : {pct(f?.ltcPct)}</span>
          <span>LTV : {pct(f?.ltvPct)}</span>
        </div>
        {prequalCase.project?.description && <p className="mt-2 text-sm">{prequalCase.project.description}</p>}
        {prequalCase.project?.exitStrategy && <p className="mt-1 text-sm text-black/70">Sortie : {prequalCase.project.exitStrategy}</p>}
      </section>

      {dealbreaker && (
        <section className="mb-4 break-inside-avoid border border-black p-2">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Obstacle rédhibitoire</h2>
          <p className="text-sm font-medium">{dealbreaker.statement}</p>
        </section>
      )}

      <section className="mb-4 grid grid-cols-2 gap-4 break-inside-avoid">
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Points forts</h2>
          {strengths.length === 0 && <p className="text-sm text-black/50">Aucun point fort identifié.</p>}
          <ul className="list-disc pl-4 text-sm">
            {strengths.map((s) => (
              <li key={s.id}>{s.statement}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Risques principaux</h2>
          {risks.length === 0 && <p className="text-sm text-black/50">Aucun risque matériel identifié.</p>}
          <ul className="list-disc pl-4 text-sm">
            {risks.map((r) => (
              <li key={r.id}>
                [{FINDING_CATEGORY_LABELS[r.category]}] {r.statement}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {openQuestions.length > 0 && (
        <section className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">Questions décisives non répondues</h2>
          <ul className="list-disc pl-4 text-sm">
            {openQuestions.map((q) => (
              <li key={q.id}>
                {q.question} {q.answerCouldChangeOrientation && <span className="italic">(peut changer l'orientation)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-6 border-t border-black pt-2 text-xs text-black/50">
        Document généré depuis ATLAS — dossier de préqualification, pré-comité. Le détail des calculs, sociétés et pièces reste accessible dans l'application.
      </footer>
    </div>,
    document.body,
  );
}
