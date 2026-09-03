import type { EsgAssessment } from '@prisma/client';

export interface EsgCompletenessInput {
  esgMateriauxBasCarbone: EsgAssessment | null;
  esgGestionEauxPluviales: string | null;
  esgEmploisChantierEstimes: number | null;
  esgAccessibilite: string | null;
  esgConformiteReglementaire: EsgAssessment | null;
}

export interface EsgCompleteness {
  filled: number;
  total: number;
  pct: number;
  environnement: { filled: number; total: number };
  social: { filled: number; total: number };
  gouvernance: { filled: number; total: number };
}

function isAssessmentFilled(value: EsgAssessment | null): boolean {
  // INCONNU est une réponse explicite mais non informative — elle ne doit
  // jamais compter comme "renseigné" (cf. commentaire du panel ESG),
  // sinon un dossier jamais examiné et un dossier examiné sans réponse
  // afficheraient la même complétude à tort.
  return value === 'OUI' || value === 'NON';
}

function isTextFilled(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

/**
 * Complétude du bloc ESG (D.3, module "entraînement analyste investissement")
 * — mesure l'effort de documentation, jamais la qualité de l'actif (cf.
 * commentaire du spec : 100% de complétude n'implique aucune performance
 * environnementale). Ne porte que sur les 5 champs manuellement
 * renseignables ajoutés en D.3 (migration esg_dimension) : le DPE (ADEME) et
 * la transparence du porteur (SIREN/surveillance), bien qu'affichés dans le
 * même panel, sont déjà collectés par d'autres mécanismes ATLAS existants et
 * ne représentent donc pas un effort de documentation ESG propre à compter
 * ici — esgNotes est un champ libre non structuré, également exclu, même
 * logique que le reste du décompte.
 */
export function computeEsgCompleteness(deal: EsgCompletenessInput): EsgCompleteness {
  const environnementFilled = [isAssessmentFilled(deal.esgMateriauxBasCarbone), isTextFilled(deal.esgGestionEauxPluviales)].filter(Boolean).length;
  const socialFilled = [deal.esgEmploisChantierEstimes != null, isTextFilled(deal.esgAccessibilite)].filter(Boolean).length;
  const gouvernanceFilled = [isAssessmentFilled(deal.esgConformiteReglementaire)].filter(Boolean).length;

  const filled = environnementFilled + socialFilled + gouvernanceFilled;
  const total = 5;

  return {
    filled,
    total,
    pct: Math.round((filled / total) * 1000) / 10,
    environnement: { filled: environnementFilled, total: 2 },
    social: { filled: socialFilled, total: 2 },
    gouvernance: { filled: gouvernanceFilled, total: 1 },
  };
}
