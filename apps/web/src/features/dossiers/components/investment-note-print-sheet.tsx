import { createPortal } from 'react-dom';
import type { Deal } from '@/types';
import { DEAL_TYPE_LABELS } from '@/types';

export interface InvestmentNoteSections {
  resume: string;
  presentation: string;
  marche: string;
  financier: string;
  risque: string;
  suivi: string;
}

/**
 * Rendu uniquement à l'impression (même doctrine que DealPrintSheet) —
 * reçoit directement le texte de chaque section en props depuis
 * InvestmentNoteSheet (même arbre de composants), pas de récupération
 * réseau propre ni d'état global. Rendu via un portail vers document.body :
 * InvestmentNoteSheet est appelé depuis un conteneur print:hidden (la barre
 * de boutons de DossierPage) — sans portail, ce composant hériterait du
 * display:none de cet ancêtre à l'impression et ne s'imprimerait jamais,
 * quel que soit son propre print:block (même technique que le Portal déjà
 * utilisé par le Sheet de Radix pour échapper à sa position dans l'arbre).
 */
export function InvestmentNotePrintSheet({ deal, sections }: { deal: Deal; sections: InvestmentNoteSections }) {
  return createPortal(
    <div className="hidden print:block print:bg-white print:p-6 print:text-black">
      <header className="mb-4 border-b border-black pb-2">
        <p className="text-xs uppercase tracking-wide text-black/60">{deal.reference} · {DEAL_TYPE_LABELS[deal.type]}</p>
        <h1 className="text-2xl font-semibold">Note d'investissement — {deal.name}</h1>
      </header>

      {([
        ['1. Résumé exécutif', sections.resume],
        ["2. Présentation de l'opération", sections.presentation],
        ['3. Analyse de marché', sections.marche],
        ['4. Analyse financière', sections.financier],
        ['5. Analyse de risque', sections.risque],
        ['6. Suivi', sections.suivi],
      ] as const).map(([title, text]) =>
        text ? (
          <section key={title} className="mb-4 break-inside-avoid">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">{title}</h2>
            <p className="whitespace-pre-line text-sm">{text}</p>
          </section>
        ) : null,
      )}

      <p className="mt-6 border-t border-black pt-2 text-[10px] text-black/60">
        Document généré par ATLAS à partir des données du dossier — brouillon compilé, la décision d'engagement reste
        de la responsabilité du comité/analyste habilité.
      </p>
    </div>,
    document.body,
  );
}
