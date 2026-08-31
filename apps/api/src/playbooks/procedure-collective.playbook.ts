/**
 * Playbook "procédure collective ouverte" — spec ATLAS v2, A.4. Un seul
 * playbook codé en dur dans ce lot ; la bibliothèque étendue par type
 * d'événement (retard, mise en demeure, sûreté invalide, défaut,
 * contentieux) est explicitement NEXT, pas construite ici.
 *
 * Rappels juridiques intégrés comme règles (à valider avec un avocat
 * spécialisé procédures collectives — ceci n'est pas un conseil juridique) :
 * - Ouverture d'une procédure collective → suspension des poursuites
 *   individuelles (art. L622-21 du Code de commerce).
 * - Délai de déclaration de créance généralement de 2 mois à compter de la
 *   publication BODACC (plus long hors zone) ; risque de forclusion à défaut.
 * - Une caution personnelle survit en général à la procédure collective de
 *   la société débitrice, sauf si elle est elle-même expirée/invalide.
 * - Une sûreté prise/renouvelée juste avant l'ouverture de la procédure peut
 *   être annulée au titre de la "période suspecte".
 */
export interface PlaybookActionDefinition {
  key: string;
  label: string;
  /** Jours après anchorDate (ex. date de publication BODACC). */
  deadlineOffsetDays: number;
  bloquant: boolean;
}

export const PROCEDURE_COLLECTIVE_ACTIONS: readonly PlaybookActionDefinition[] = [
  { key: 'identifier_type_procedure', label: 'Identifier le type de procédure', deadlineOffsetDays: 0, bloquant: false },
  { key: 'declaration_creance', label: 'Déclaration de créance', deadlineOffsetDays: 60, bloquant: true },
  {
    key: 'verifier_caution_personnelle_poursuivable',
    label: 'Vérifier si la caution personnelle est poursuivable',
    deadlineOffsetDays: 15,
    bloquant: false,
  },
  {
    key: 'verifier_periode_suspecte_suretes',
    label: 'Vérifier la période suspecte sur les sûretés',
    deadlineOffsetDays: 15,
    bloquant: false,
  },
];
