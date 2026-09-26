import { escapeHtml, wrapPrintDocument } from '../pdf-export/print-html.util';
import type { InvestmentNoteSectionsDto } from './dto/investment-note-sections.dto';
import type { DealsService } from './deals.service';

type DealDetail = Awaited<ReturnType<DealsService['findOne']>>;

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

const SECTION_TITLES: Array<[keyof InvestmentNoteSectionsDto, string]> = [
  ['resume', '1. Résumé exécutif'],
  ['presentation', "2. Présentation de l'opération"],
  ['marche', '3. Analyse de marché'],
  ['financier', '4. Analyse financière'],
  ['risque', '5. Analyse de risque'],
  ['suivi', '6. Suivi'],
];

/**
 * Port serveur exact de `investment-note-print-sheet.tsx`. Contrairement aux
 * autres exports, le contenu des sections n'est JAMAIS persisté côté serveur
 * (édité librement par l'analyste, cf. investment-note-sheet.tsx) : on rend
 * donc exactement le texte envoyé par le client, jamais un recalcul.
 */
export function buildInvestmentNoteHtml(deal: DealDetail, sections: InvestmentNoteSectionsDto): string {
  const sectionsHtml = SECTION_TITLES.filter(([key]) => sections[key]?.trim())
    .map(
      ([key, title]) => `<section>
        <h2>${escapeHtml(title)}</h2>
        <p style="white-space:pre-line;">${escapeHtml(sections[key] as string)}</p>
      </section>`,
    )
    .join('');

  const body = `
    <header class="doc-header">
      <p class="doc-meta">${escapeHtml(deal.reference)} · ${escapeHtml(DEAL_TYPE_LABELS[deal.type] ?? deal.type)}</p>
      <h1>Note d'investissement — ${escapeHtml(deal.name)}</h1>
    </header>

    ${sectionsHtml}

    <footer class="doc-footer">
      Document de travail compilé à partir des données du dossier et des analyses saisies par l'équipe. La décision d'investissement reste de la responsabilité du comité — Atlas Capital, document interne, non contractuel.
    </footer>
  `;

  return wrapPrintDocument(`Note d'investissement — ${deal.name}`, body);
}
