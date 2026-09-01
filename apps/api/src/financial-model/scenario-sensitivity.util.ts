/**
 * D.1 — Module de sensibilité de scénario (spec complémentaire ATLAS
 * "modules d'entraînement au métier d'analyste investissement").
 *
 * Vision retenue pour le TRI/multiple : rendement du PROJET, pas du prêt LPB
 * — capital investi = coût de revient total du projet (foncier + travaux +
 * honoraires + financement), capital rendu = prix de vente à la sortie.
 * C'est la généralisation naturelle de la marge déjà calculée par
 * financial-model.service.ts#buildResponse (marge = prixDeVente -
 * coutDeRevient) : ce module ajoute la dimension temporelle (durée
 * effective de détention) pour en tirer un TRI et un multiple, sans
 * introduire de nouvelle donnée de base (pas de champ "capital apporté" —
 * il n'en existe pas dans le schéma).
 *
 * Le scénario "Central" (tous les deltas à zéro) doit reproduire
 * EXACTEMENT la marge/coût de revient actuels renvoyés par buildResponse()
 * — c'est ce qui garantit que ce module n'invente pas un second calcul de
 * marge parallèle et incohérent avec celui déjà affiché ailleurs dans le
 * panneau financier.
 */

export interface ScenarioDeltas {
  /** Points de taux (ex. +1.5 = +1,5 pt) appliqués au taux LPB effectif actuel. */
  tauxDeltaPts?: number;
  /** Mois ajoutés/retranchés à la durée cible actuelle du financement. */
  dureeDeltaMonths?: number;
  /** Variation en % du prix de vente actuel (positif ou négatif). */
  prixSortiePctDelta?: number;
  /** Variation en % du total travaux actuel. */
  travauxPctDelta?: number;
  /**
   * Mois de retard de commercialisation au-delà de la durée cible ajustée —
   * toujours >= 0 (un délai ne peut pas être négatif ; une commercialisation
   * plus rapide que prévu n'allonge simplement pas la détention, elle ne
   * "rembourse" pas la durée cible elle-même — cf. dureeDeltaMonths pour ça).
   * Exposé au même taux de pénalité que le suivi CRD hors-contrat (+5 pts) :
   * un retard de commercialisation expose le financement au-delà de sa durée
   * prévue, exactement comme un retard de remboursement.
   */
  delaiCommercialisationMonths?: number;
}

type ResolvedDeltas = Required<ScenarioDeltas>;

export interface ScenarioBaseInputs {
  surface: number;
  prixDeVenteBase: number;
  foncierTotal: number;
  travauxTotalBase: number;
  honorairesTechniquesTotal: number;
  /** agencyFees + referralFees + bankMiscFees — indépendant de taux/durée/délai. */
  autresFraisHorsFinancement: number;
  collecteLpb: number;
  /** Taux LPB effectif ACTUEL (inclut déjà la pénalité de retard manuelle si cochée) — point zéro des deltas de taux. */
  tauxEffectifBaseLpb: number;
  dureeCibleBaseMonths: number;
  /** Frais LPB indépendants de la durée/du taux (HT+TVA), constants sur tous les scénarios. */
  lpbFeesTTC: number;
  /** Estimation frais de garantie LPB, constante (dépend de collecte + hypothèque active, pas de la durée). */
  lpbGuaranteeFeesEstimate: number;
  bankEnabled: boolean;
  bankLoanTotal: number;
  bankRatePct: number | null;
  /** bankGuaranteeFees + bankFileFees*1.2 — constant, indépendant de la durée. */
  bankFixedFees: number;
}

export interface ScenarioResult {
  label: string;
  deltas: ResolvedDeltas;
  tauxEffectifPct: number;
  dureeCibleMonths: number;
  dureeEffectiveMonths: number;
  prixDeVente: number;
  coutDeRevient: number;
  marge: number;
  margePct: number;
  /** Prix de sortie minimum (total) pour ne pas être en perte — marge = 0. */
  pointMortTotal: number;
  pointMortPerSqm: number | null;
  /** Capital rendu / capital investi = prixDeVente / coûtDeRevient. */
  multipleCapital: number | null;
  /** TRI annualisé — formule fermée exacte pour un flux unique investi puis rendu à une date, pas une approximation d'XIRR. */
  triAnnuelPct: number | null;
}

const LATE_PENALTY_RATE_POINTS = 5;

function resolveDeltas(deltas: ScenarioDeltas): ResolvedDeltas {
  return {
    tauxDeltaPts: deltas.tauxDeltaPts ?? 0,
    dureeDeltaMonths: deltas.dureeDeltaMonths ?? 0,
    prixSortiePctDelta: deltas.prixSortiePctDelta ?? 0,
    travauxPctDelta: deltas.travauxPctDelta ?? 0,
    delaiCommercialisationMonths: Math.max(0, deltas.delaiCommercialisationMonths ?? 0),
  };
}

export function computeScenario(base: ScenarioBaseInputs, rawDeltas: ScenarioDeltas, label: string): ScenarioResult {
  const deltas = resolveDeltas(rawDeltas);

  const tauxEffectifPct = Math.max(0, base.tauxEffectifBaseLpb + deltas.tauxDeltaPts);
  const dureeCibleMonths = Math.max(0, base.dureeCibleBaseMonths + deltas.dureeDeltaMonths);
  const dureeEffectiveMonths = dureeCibleMonths + deltas.delaiCommercialisationMonths;

  const lpbInterestSurDureeCible = (base.collecteLpb * (tauxEffectifPct / 100) * dureeCibleMonths) / 12;
  const lpbInterestSurDelai = (base.collecteLpb * ((tauxEffectifPct + LATE_PENALTY_RATE_POINTS) / 100) * deltas.delaiCommercialisationMonths) / 12;
  const lpbTotalFees = base.lpbGuaranteeFeesEstimate + lpbInterestSurDureeCible + lpbInterestSurDelai + base.lpbFeesTTC;

  const bankInterest = base.bankEnabled ? (base.bankLoanTotal * ((base.bankRatePct ?? 0) / 100) * dureeEffectiveMonths) / 12 : 0;
  const bankTotalFees = base.bankEnabled ? bankInterest + base.bankFixedFees : 0;

  const travauxTotal = Math.max(0, base.travauxTotalBase * (1 + deltas.travauxPctDelta / 100));
  const autresFraisTotal = base.autresFraisHorsFinancement + lpbTotalFees + bankTotalFees;
  const coutDeRevient = base.foncierTotal + travauxTotal + base.honorairesTechniquesTotal + autresFraisTotal;

  const prixDeVente = Math.max(0, base.prixDeVenteBase * (1 + deltas.prixSortiePctDelta / 100));
  const marge = prixDeVente - coutDeRevient;
  const margePct = prixDeVente > 0 ? Math.round((marge / prixDeVente) * 1000) / 10 : 0;

  const pointMortTotal = coutDeRevient;
  const pointMortPerSqm = base.surface > 0 ? pointMortTotal / base.surface : null;

  const multipleCapital = coutDeRevient > 0 ? prixDeVente / coutDeRevient : null;
  const triAnnuelPct =
    multipleCapital !== null && dureeEffectiveMonths > 0 ? (Math.pow(multipleCapital, 12 / dureeEffectiveMonths) - 1) * 100 : null;

  return {
    label,
    deltas,
    tauxEffectifPct: Math.round(tauxEffectifPct * 100) / 100,
    dureeCibleMonths,
    dureeEffectiveMonths,
    prixDeVente: Math.round(prixDeVente),
    coutDeRevient: Math.round(coutDeRevient),
    marge: Math.round(marge),
    margePct,
    pointMortTotal: Math.round(pointMortTotal),
    pointMortPerSqm: pointMortPerSqm !== null ? Math.round(pointMortPerSqm) : null,
    multipleCapital: multipleCapital !== null ? Math.round(multipleCapital * 1000) / 1000 : null,
    triAnnuelPct: triAnnuelPct !== null ? Math.round(triAnnuelPct * 10) / 10 : null,
  };
}

/**
 * Scénarios prédéfinis Pessimiste/Central/Optimiste — valeurs illustratives
 * assumées explicitement ici (pas de norme externe), distinctes du couple
 * ±10% déjà utilisé par la carte "Sensibilité" existante (financial-model.service.ts,
 * qui ne fait varier que prix de vente et coût total ensemble, sans les
 * décomposer par variable ni calculer TRI/multiple). Un utilisateur qui veut
 * un scénario différent utilise le scénario personnalisé (deltas libres).
 */
export const PREDEFINED_SCENARIOS: Record<'pessimiste' | 'central' | 'optimiste', ScenarioDeltas> = {
  pessimiste: { tauxDeltaPts: 1.5, dureeDeltaMonths: 2, prixSortiePctDelta: -8, travauxPctDelta: 10, delaiCommercialisationMonths: 3 },
  central: {},
  optimiste: { tauxDeltaPts: -0.5, dureeDeltaMonths: -1, prixSortiePctDelta: 5, travauxPctDelta: -3, delaiCommercialisationMonths: 0 },
};

export type SensitivityAxisVariable = keyof ScenarioDeltas;

export interface SensitivityMatrix {
  rowVariable: SensitivityAxisVariable;
  colVariable: SensitivityAxisVariable;
  rowValues: number[];
  colValues: number[];
  cells: ScenarioResult[][];
}

export function computeSensitivityMatrix(
  base: ScenarioBaseInputs,
  rowVariable: SensitivityAxisVariable,
  rowValues: number[],
  colVariable: SensitivityAxisVariable,
  colValues: number[],
): SensitivityMatrix {
  const cells = rowValues.map((rowValue) =>
    colValues.map((colValue) => {
      const deltas: ScenarioDeltas = { [rowVariable]: rowValue, [colVariable]: colValue };
      return computeScenario(base, deltas, `${rowVariable}=${rowValue} × ${colVariable}=${colValue}`);
    }),
  );
  return { rowVariable, colVariable, rowValues, colValues, cells };
}
