export interface FactorDefinition {
  key: string;
  label: string;
  /** Part du score final, 0-1. */
  weight: number;
  /** Pourquoi ce facteur et pourquoi ce poids — grille experte interne, pas une calibration statistique (voir la limite documentée sur METHODOLOGY_DISCLAIMER). */
  rationale: string;
}

/**
 * Source unique des poids du Risk Engine — chaque fonction xxxFactor() de
 * RiskEngineService lit son poids ici plutôt que de le redéclarer en dur,
 * pour que la méthodologie affichée dans l'app (GET /risk-model/methodology)
 * ne puisse jamais diverger du calcul réel.
 */
export const FACTOR_DEFINITIONS: FactorDefinition[] = [
  {
    key: 'echeance',
    label: 'Échéance de vote',
    weight: 0.2,
    rationale:
      'Une échéance de vote qui approche ou est dépassée est le signal le plus direct qu\'un dossier nécessite une décision immédiate — poids aligné sur son urgence opérationnelle.',
  },
  {
    key: 'chantier',
    label: 'Suivi chantier / commercialisation',
    weight: 0.2,
    rationale:
      "L'avancement réel du chantier et de la commercialisation face au prévisionnel est l'indicateur le plus tangible de la trajectoire du projet immobilier lui-même.",
  },
  {
    key: 'recouvrement',
    label: 'Statut de recouvrement',
    weight: 0.2,
    rationale:
      "Le statut de recouvrement (mise en demeure, procédure) est un fait déjà constaté, pas un risque anticipé — poids élevé car il s'agit d'un problème avéré, pas d'une hypothèse.",
  },
  {
    key: 'porteur',
    label: 'Santé du porteur de projet',
    weight: 0.15,
    rationale:
      "La santé administrative du porteur (procédure collective, radiation) conditionne sa capacité à mener l'opération à terme, mais reste un signal externe et parfois tardif — poids inférieur aux trois facteurs qui portent directement sur le dossier.",
  },
  {
    key: 'garanties',
    label: 'Garanties / sûretés',
    weight: 0.15,
    rationale:
      "Les sûretés déterminent la récupération en cas de défaut, pas la probabilité du défaut lui-même — pertinentes pour l'exposition finale plutôt que pour l'anticipation du risque.",
  },
  {
    key: 'newsletter',
    label: 'Communication investisseurs',
    weight: 0.05,
    rationale:
      "La régularité de la communication est un signal indirect (un porteur qui communique moins peut annoncer un problème à venir) — poids volontairement faible, ce n'est pas un indicateur de risque opérationnel direct.",
  },
  {
    key: 'environnement',
    label: 'Risques environnementaux',
    weight: 0.05,
    rationale:
      "Les risques environnementaux (inondation, sismique) sont structurels et rarement le facteur déclencheur d'un défaut à l'échéance du financement — poids faible et indicatif, d'autant que la donnée n'est pas toujours disponible (facteur neutre par défaut dans ce cas).",
  },
];

export const METHODOLOGY_DISCLAIMER =
  "Ces pondérations sont une grille experte interne (jugement métier sur l'importance relative de chaque signal), pas un modèle calibré " +
  "statistiquement : ATLAS ne dispose pas encore d'un historique de dossiers clos en nombre suffisant pour valider ou ajuster ces poids " +
  'par la donnée. La section "Validation rétrospective" accumule cet historique au fil des clôtures réelles — à consulter pour juger de ' +
  'la fiabilité du modèle avant de le traiter comme une notation stabilisée.';

export function factorWeight(key: string): number {
  const def = FACTOR_DEFINITIONS.find((f) => f.key === key);
  if (!def) throw new Error(`Poids inconnu pour le facteur "${key}" — absent de FACTOR_DEFINITIONS.`);
  return def.weight;
}
