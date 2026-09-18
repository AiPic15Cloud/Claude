/**
 * Stress tests (spec ATLAS "Moteur de préqualification" v1.0, §11) — moteur
 * pur, registre fermé des 9 scénarios standards de la spec (jamais un
 * scénario évalué dynamiquement à partir d'un champ libre, même doctrine que
 * `eliminatory-rule.util.ts`). Chaque scénario reprend les mêmes briques de
 * calcul que `prequal-financial.util.ts` (foncier/travaux/honoraires/autres
 * frais/financement) perturbées un axe à la fois — jamais un second moteur
 * de marge parallèle : un scénario à deltas nuls reproduirait exactement
 * `PrequalFinancialResult`.
 *
 * "Vente du lot le plus important à la médiane" nécessite la médiane du
 * marché (§10, `prequal-market-study.util.ts`) — le scénario est marqué
 * `applicable: false` si elle est inconnue, jamais une médiane inventée.
 * "Acquisition d'une parcelle conditionnelle impossible" est un scénario
 * d'abandon du projet, pas un calcul de marge dégradée : marge/ratios
 * restent `null`, `capaciteRemboursement: 'NON_QUANTIFIABLE'`.
 */

const LATE_PENALTY_RATE_POINTS = 5;

export interface PrequalStressLotInput {
  label: string;
  surfaceSqm: number | null;
  price: number | null;
  /** 'NOT_MARKETED' | 'MARKETED' considérés non précommercialisés — toute autre valeur (INTEREST/OFFER/RESERVATION/PROMISE/DEED) considérée engagée. */
  status: string;
}

export interface PrequalStressTestInput {
  foncierTotal: number;
  travauxTotal: number;
  honorairesTechniquesTotal: number;
  autresFraisScalaires: number;
  chiffreAffaires: number;
  otherRevenueRetained: number | null;
  amountRequested: number | null;
  landPrice: number | null;
  interestRatePct: number | null;
  latePenaltyApplied: boolean;
  durationTargetMonths: number | null;
  feesTTC: number;
  guaranteeFeesEstimate: number;
  bankEnabled: boolean;
  bankLoanTotal: number;
  bankInterestRatePct: number | null;
  bankFixedFees: number;
  lots: PrequalStressLotInput[];
  /** Médiane €/m² du marché (spec §10) — null si aucune étude de marché disponible. */
  medianPricePerSqm: number | null;
  /** Statut d'acquisition du foncier (PrequalAcquisitionStatus) — le scénario §11.9 n'est pertinent que si l'acquisition n'est pas encore actée. */
  acquisitionStatus: string | null;
}

export type PrequalStressCapacity = 'OK' | 'TENDUE' | 'INSUFFISANTE' | 'NON_QUANTIFIABLE';

export interface PrequalStressScenario {
  key: string;
  label: string;
  description: string;
  applicable: boolean;
  unavailableReason: string | null;
  margeEuros: number | null;
  margePct: number | null;
  besoinComplementaire: number | null;
  ltcPct: number | null;
  ltvPct: number | null;
  capaciteRemboursement: PrequalStressCapacity;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function ratioPct(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function financingFees(input: PrequalStressTestInput, durationMonths: number | null): { totalFees: number; bankTotalFees: number } {
  const collecte = input.amountRequested ?? 0;
  const tauxEffectif = input.interestRatePct !== null ? input.interestRatePct + (input.latePenaltyApplied ? LATE_PENALTY_RATE_POINTS : 0) : null;
  const interestOnDuration = tauxEffectif !== null && durationMonths !== null ? (collecte * (tauxEffectif / 100) * durationMonths) / 12 : 0;
  const totalFees = round2(input.guaranteeFeesEstimate + interestOnDuration + input.feesTTC);

  const bankInterest =
    input.bankEnabled && input.bankInterestRatePct !== null && durationMonths !== null ? (input.bankLoanTotal * (input.bankInterestRatePct / 100) * durationMonths) / 12 : 0;
  const bankTotalFees = input.bankEnabled ? round2(bankInterest + input.bankFixedFees) : 0;

  return { totalFees, bankTotalFees };
}

function buildScenario(
  key: string,
  label: string,
  description: string,
  input: PrequalStressTestInput,
  overrides: { chiffreAffaires?: number; travauxTotal?: number; foncierTotal?: number; otherRevenueRetained?: number | null; durationMonths?: number | null },
): PrequalStressScenario {
  const chiffreAffaires = overrides.chiffreAffaires ?? input.chiffreAffaires;
  const travauxTotal = overrides.travauxTotal ?? input.travauxTotal;
  const foncierTotal = overrides.foncierTotal ?? input.foncierTotal;
  const otherRevenue = overrides.otherRevenueRetained !== undefined ? (overrides.otherRevenueRetained ?? 0) : (input.otherRevenueRetained ?? 0);
  const durationMonths = overrides.durationMonths !== undefined ? overrides.durationMonths : input.durationTargetMonths;

  const { totalFees, bankTotalFees } = financingFees(input, durationMonths);
  const autresFraisTotal = input.autresFraisScalaires + totalFees;
  const coutDeRevient = round2(foncierTotal + travauxTotal + input.honorairesTechniquesTotal + autresFraisTotal);

  const marge = round2(chiffreAffaires + otherRevenue - coutDeRevient);
  const totalRevenue = chiffreAffaires + otherRevenue;
  const margePct = totalRevenue > 0 ? Math.round((marge / totalRevenue) * 1000) / 10 : null;

  const collecte = input.amountRequested ?? 0;
  const financingExposure = input.amountRequested !== null ? input.amountRequested + input.bankLoanTotal + bankTotalFees : null;
  const besoinComplementaire = financingExposure !== null ? Math.max(0, round2(coutDeRevient - financingExposure)) : null;

  const capaciteRemboursement: PrequalStressCapacity = marge < 0 ? 'INSUFFISANTE' : marge < totalFees + bankTotalFees ? 'TENDUE' : 'OK';

  return {
    key,
    label,
    description,
    applicable: true,
    unavailableReason: null,
    margeEuros: marge,
    margePct,
    besoinComplementaire,
    ltcPct: ratioPct(collecte, coutDeRevient),
    ltvPct: ratioPct(collecte, chiffreAffaires > 0 ? chiffreAffaires : null),
    capaciteRemboursement,
  };
}

function unavailable(key: string, label: string, description: string, reason: string): PrequalStressScenario {
  return {
    key,
    label,
    description,
    applicable: false,
    unavailableReason: reason,
    margeEuros: null,
    margePct: null,
    besoinComplementaire: null,
    ltcPct: null,
    ltvPct: null,
    capaciteRemboursement: 'NON_QUANTIFIABLE',
  };
}

export function computePrequalStressTests(input: PrequalStressTestInput): PrequalStressScenario[] {
  const scenarios: PrequalStressScenario[] = [];

  for (const pct of [5, 10, 15]) {
    scenarios.push(
      buildScenario(`baisse_prix_${pct}`, `Baisse des prix de ${pct} %`, `Chiffre d'affaires réduit de ${pct} % par rapport au bilan actuel.`, input, {
        chiffreAffaires: round2(input.chiffreAffaires * (1 - pct / 100)),
      }),
    );
  }

  for (const pct of [10, 20]) {
    scenarios.push(
      buildScenario(`hausse_travaux_${pct}`, `Hausse des travaux de ${pct} %`, `Coût des travaux augmenté de ${pct} % par rapport au bilan actuel.`, input, {
        travauxTotal: round2(input.travauxTotal * (1 + pct / 100)),
      }),
    );
  }

  for (const months of [3, 6, 12]) {
    const baseDuration = input.durationTargetMonths ?? 0;
    scenarios.push(
      buildScenario(`retard_${months}`, `Retard de ${months} mois`, `Durée de financement allongée de ${months} mois, intérêts recalculés sur la durée effective.`, input, {
        durationMonths: baseDuration + months,
      }),
    );
  }

  scenarios.push(
    buildScenario(
      'combinaison',
      'Baisse des prix + hausse des travaux + retard',
      "Combinaison des scénarios les plus défavorables : prix -15 %, travaux +20 %, retard de 12 mois.",
      input,
      {
        chiffreAffaires: round2(input.chiffreAffaires * 0.85),
        travauxTotal: round2(input.travauxTotal * 1.2),
        durationMonths: (input.durationTargetMonths ?? 0) + 12,
      },
    ),
  );

  if (input.otherRevenueRetained === null || input.otherRevenueRetained === 0) {
    scenarios.push(unavailable('absence_revenus_locatifs', 'Absence des revenus locatifs', 'Retrait des produits intermédiaires retenus pendant le portage.', 'Aucun revenu locatif intermédiaire renseigné dans le bilan — scénario sans effet.'));
  } else {
    scenarios.push(
      buildScenario('absence_revenus_locatifs', 'Absence des revenus locatifs', 'Retrait des produits intermédiaires retenus pendant le portage.', input, {
        otherRevenueRetained: 0,
      }),
    );
  }

  const pricedLots = input.lots.filter((l) => l.price !== null);
  if (input.medianPricePerSqm === null || pricedLots.length === 0) {
    scenarios.push(
      unavailable(
        'vente_lot_principal_mediane',
        'Vente du lot le plus important à la médiane',
        'Le lot au prix le plus élevé est revendu au prix médian du marché plutôt qu\'à son prix attendu.',
        input.medianPricePerSqm === null ? "Aucune médiane de marché disponible (étude de marché, spec §10)." : 'Aucun lot avec un prix renseigné.',
      ),
    );
  } else {
    const mainLot = pricedLots.reduce((max, l) => (l.price! > max.price! ? l : max));
    if (mainLot.surfaceSqm === null) {
      scenarios.push(unavailable('vente_lot_principal_mediane', 'Vente du lot le plus important à la médiane', "Le lot le plus important est revendu au prix médian du marché.", `Surface du lot "${mainLot.label}" non renseignée.`));
    } else {
      const mainLotAtMedian = round2(input.medianPricePerSqm * mainLot.surfaceSqm);
      const chiffreAffairesAjuste = round2(input.chiffreAffaires - (mainLot.price ?? 0) + mainLotAtMedian);
      scenarios.push(
        buildScenario(
          'vente_lot_principal_mediane',
          'Vente du lot le plus important à la médiane',
          `Le lot "${mainLot.label}" (le plus cher du dossier) est revendu à la médiane du marché (${input.medianPricePerSqm} €/m²) plutôt qu'à son prix attendu.`,
          input,
          { chiffreAffaires: chiffreAffairesAjuste },
        ),
      );
    }
  }

  const nonPrecommercialises = input.lots.filter((l) => l.status === 'NOT_MARKETED' || l.status === 'MARKETED');
  if (input.lots.length === 0) {
    scenarios.push(unavailable('non_realisation_precommercialisation', "Non-réalisation d'une précommercialisation", 'Le chiffre d\'affaires des lots non encore engagés (offre/réservation/promesse/acte) est retiré.', 'Aucun lot saisi dans la grille de commercialisation.'));
  } else if (nonPrecommercialises.length === 0) {
    scenarios.push(unavailable('non_realisation_precommercialisation', "Non-réalisation d'une précommercialisation", 'Le chiffre d\'affaires des lots non encore engagés (offre/réservation/promesse/acte) est retiré.', 'Tous les lots sont déjà à un stade engagé (offre ou plus) — scénario sans objet.'));
  } else {
    const perteCA = nonPrecommercialises.reduce((sum, l) => sum + (l.price ?? 0), 0);
    scenarios.push(
      buildScenario(
        'non_realisation_precommercialisation',
        "Non-réalisation d'une précommercialisation",
        `${nonPrecommercialises.length} lot(s) non encore engagé(s) considéré(s) comme non vendus.`,
        input,
        { chiffreAffaires: round2(input.chiffreAffaires - perteCA) },
      ),
    );
  }

  scenarios.push(
    buildScenario(
      'surcout_viabilisation',
      'Coût de viabilisation supérieur',
      "Surcoût de viabilisation imprévu, estimé à 15 % du foncier (aucun poste dédié en P0/P1 — approximation documentée).",
      input,
      { foncierTotal: round2(input.foncierTotal * 1.15) },
    ),
  );

  if (input.acquisitionStatus === 'OFFRE' || input.acquisitionStatus === 'PROMESSE') {
    scenarios.push({
      key: 'acquisition_conditionnelle_impossible',
      label: "Acquisition d'une parcelle conditionnelle impossible",
      description: "Le foncier ne peut finalement pas être acquis — le projet est abandonné, aucune marge n'est réalisée.",
      applicable: true,
      unavailableReason: null,
      margeEuros: null,
      margePct: null,
      besoinComplementaire: null,
      ltcPct: null,
      ltvPct: null,
      capaciteRemboursement: 'NON_QUANTIFIABLE',
    });
  } else {
    scenarios.push(
      unavailable(
        'acquisition_conditionnelle_impossible',
        "Acquisition d'une parcelle conditionnelle impossible",
        "Le foncier ne peut finalement pas être acquis — le projet est abandonné.",
        "Le foncier n'est pas dans une situation d'acquisition conditionnelle (offre/promesse) — scénario sans objet.",
      ),
    );
  }

  return scenarios;
}
