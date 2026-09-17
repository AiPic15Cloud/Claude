/**
 * Contrôles arithmétiques automatiques (spec ATLAS "Moteur de préqualification"
 * v1.0, §9.4) — registre fermé de contrôles, même doctrine que
 * `fractional/eliminatory-rule.util.ts` : chaque contrôle est nommé et codé
 * en dur, jamais une expression évaluée dynamiquement à partir d'un champ
 * libre. Produit des candidats de `Finding` (catégorie/sévérité/statement/
 * rationale/ruleId), la persistance et le `reviewStatus` restent du ressort
 * du service appelant — cette fonction est pure et ne touche jamais la base.
 */

import type { PrequalFinancialResult } from './prequal-financial.util';

export type PrequalFindingCategory = 'OPERATOR' | 'COMPANY' | 'FINANCIAL' | 'MARKET' | 'PLANNING' | 'COMMERCIALISATION' | 'WORKS' | 'LEGAL' | 'EXPOSURE';
export type PrequalFindingSeverity = 'INFO' | 'POSITIVE' | 'WATCH' | 'MATERIAL' | 'BLOCKING';

export interface PrequalFindingCandidate {
  ruleId: string;
  category: PrequalFindingCategory;
  severity: PrequalFindingSeverity;
  statement: string;
  rationale: string;
}

/** Seuil d'écart (en % du montant ATLAS) à partir duquel un écart déclaré/recalculé devient un Finding plutôt qu'un simple arrondi. */
const MATERIAL_AMOUNT_DEVIATION_PCT = 5;
/** Seuil d'écart (en points de marge) à partir duquel l'écart marge annoncée/recalculée devient MATERIAL plutôt que WATCH. */
const MATERIAL_MARGIN_DEVIATION_PTS = 5;

function formatEuros(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function deviationPct(diff: number, base: number): number | null {
  if (base === 0) return null;
  return Math.abs((diff / base) * 100);
}

export interface PrequalFinancialFindingsContext {
  declaredEquity: number | null;
  provenEquity: number | null;
  amountRequested: number | null;
}

export function evaluatePrequalFinancialFindings(result: PrequalFinancialResult, context: PrequalFinancialFindingsContext): PrequalFindingCandidate[] {
  const findings: PrequalFindingCandidate[] = [];

  if (result.marge < 0) {
    findings.push({
      ruleId: 'MARGE_NEGATIVE',
      category: 'FINANCIAL',
      severity: 'BLOCKING',
      statement: `Marge recalculée négative (${formatEuros(result.marge)}).`,
      rationale: 'Coût de revient supérieur au chiffre d\'affaires + autres produits retenus, sur la base des postes et lots actuellement saisis.',
    });
  }

  if (result.lotsWithoutPriceCount > 0) {
    findings.push({
      ruleId: 'LOTS_SANS_PRIX',
      category: 'COMMERCIALISATION',
      severity: 'WATCH',
      statement: `${result.lotsWithoutPriceCount} lot(s) sans prix renseigné — chiffre d'affaires potentiellement sous-estimé.`,
      rationale: "Le chiffre d'affaires recalculé n'inclut que les lots ayant un prix (attendu ou affiché) renseigné ; un lot sans prix n'est jamais compté comme 0.",
    });
  }

  if (result.coutDeRevientEcartVsDeclare !== null) {
    const pct = deviationPct(result.coutDeRevientEcartVsDeclare, result.coutDeRevient);
    if (pct !== null && pct >= MATERIAL_AMOUNT_DEVIATION_PCT) {
      findings.push({
        ruleId: 'ECART_COUT_DE_REVIENT',
        category: 'FINANCIAL',
        severity: 'MATERIAL',
        statement: `Coût de revient ATLAS (${formatEuros(result.coutDeRevient)}) diffère de la version opérateur de ${pct.toFixed(1)} %.`,
        rationale: 'Écart entre la somme des postes de coût normalisés et le coût de revient annoncé par l\'opérateur.',
      });
    }
  }

  if (result.chiffreAffairesEcartVsDeclare !== null) {
    const pct = deviationPct(result.chiffreAffairesEcartVsDeclare, result.chiffreAffaires);
    if (pct !== null && pct >= MATERIAL_AMOUNT_DEVIATION_PCT) {
      findings.push({
        ruleId: 'ECART_CHIFFRE_AFFAIRES',
        category: 'FINANCIAL',
        severity: 'MATERIAL',
        statement: `Chiffre d'affaires ATLAS (${formatEuros(result.chiffreAffaires)}) diffère de la version opérateur de ${pct.toFixed(1)} %.`,
        rationale: 'Écart entre la somme des prix de lots recalculée et le chiffre d\'affaires annoncé par l\'opérateur.',
      });
    }
  }

  if (result.margeEcartVsAnnonceePts !== null) {
    const absPts = Math.abs(result.margeEcartVsAnnonceePts);
    if (absPts >= MATERIAL_MARGIN_DEVIATION_PTS) {
      findings.push({
        ruleId: 'ECART_MARGE',
        category: 'FINANCIAL',
        severity: absPts >= MATERIAL_MARGIN_DEVIATION_PTS * 2 ? 'MATERIAL' : 'WATCH',
        statement: `Marge recalculée (${result.margePct?.toFixed(1)} %) diffère de la marge annoncée de ${result.margeEcartVsAnnonceePts.toFixed(1)} pt.`,
        rationale: 'Comparaison directe entre la marge sur CA recalculée par ATLAS à partir des postes/lots saisis et la marge déclarée par l\'opérateur.',
      });
    }
  }

  if (context.declaredEquity !== null && context.provenEquity !== null && context.provenEquity < context.declaredEquity) {
    findings.push({
      ruleId: 'APPORT_ANNONCE_SUPERIEUR_PROUVE',
      category: 'FINANCIAL',
      severity: 'MATERIAL',
      statement: `Apport prouvé (${formatEuros(context.provenEquity)}) inférieur à l'apport annoncé (${formatEuros(context.declaredEquity)}).`,
      rationale: "L'apport annoncé ne devient prouvé qu'avec une pièce justificative — l'écart reste ouvert tant qu'aucune preuve complémentaire n'est apportée.",
    });
  }
  if (context.declaredEquity === null && context.provenEquity === null) {
    findings.push({
      ruleId: 'APPORT_NON_RENSEIGNE',
      category: 'FINANCIAL',
      severity: 'WATCH',
      statement: "Aucun apport (annoncé ou prouvé) renseigné à ce stade.",
      rationale: 'Une absence de donnée reste une absence de donnée, jamais un apport nul supposé.',
    });
  }

  if (context.amountRequested !== null && result.besoinMaxFinancement !== null) {
    const gap = result.besoinMaxFinancement - context.amountRequested;
    const pct = deviationPct(gap, context.amountRequested);
    if (pct !== null && pct >= MATERIAL_AMOUNT_DEVIATION_PCT && gap > 0) {
      findings.push({
        ruleId: 'BESOIN_SUPERIEUR_AU_MONTANT_RECHERCHE',
        category: 'FINANCIAL',
        severity: 'MATERIAL',
        statement: `Besoin de financement reconstitué (${formatEuros(result.besoinMaxFinancement)}) supérieur au montant recherché (${formatEuros(context.amountRequested)}).`,
        rationale: 'Approximation statique (coût de revient − apport prouvé) — voir la limite documentée dans prequal-financial.util.ts.',
      });
    }
  }

  if (result.margePct !== null && result.margePct > 0 && result.margePct < 10) {
    findings.push({
      ruleId: 'MARGE_FAIBLE',
      category: 'FINANCIAL',
      severity: 'WATCH',
      statement: `Marge sur CA recalculée faible (${result.margePct.toFixed(1)} %).`,
      rationale: "Une marge positive mais serrée laisse peu de coussin face à un aléa de prix de sortie ou de coût de travaux — à mettre en regard des stress tests (hors périmètre P0).",
    });
  }

  return findings;
}
