/**
 * Comparatif de plateformes formalisé (spec Cockpit/Fractionné P2 §5.3) —
 * transforme les candidatures indépendantes d'un dossier (chacune avec son
 * propre statut/échanges/offre) en une matrice lisible côte à côte. Les
 * critères issus du profil plateforme (hurdle, frais, durée cible) sont
 * toujours renseignés ; ceux issus de `comparedCriteria` (négociés au cas
 * par cas) restent explicitement "à confirmer" pour une candidature qui ne
 * les a pas — jamais silencieusement absents de la comparaison (spec §5.3 :
 * "les critères non communiqués restent à confirmer").
 */

export interface PlatformComparisonCandidateInput {
  id: string;
  status: string;
  platformProfile: {
    id: string;
    platformName: string;
    minNetInvestorYieldPct: number;
    targetHoldPeriodMonths: number | null;
    acquisitionFeePct: number;
    annualManagementFeePct: number;
    incomeShareInvestorPct: number;
    capitalGainShareInvestorPct: number;
  };
  offerSummary: string | null;
  rejectionReason: string | null;
  comparedCriteria: Record<string, unknown> | null;
}

export interface PlatformComparisonRow {
  key: string;
  label: string;
  /** Une valeur par candidature, dans le même ordre que `candidates` — null = "à confirmer". */
  values: (string | number | null)[];
}

export interface PlatformComparisonResult {
  candidateIds: string[];
  candidateLabels: string[];
  rows: PlatformComparisonRow[];
}

const FIXED_ROWS: { key: string; label: string; extract: (c: PlatformComparisonCandidateInput) => string | number | null }[] = [
  { key: 'status', label: 'Statut', extract: (c) => c.status },
  { key: 'hurdle', label: 'Hurdle net investisseur', extract: (c) => `${c.platformProfile.minNetInvestorYieldPct} %` },
  { key: 'holdPeriod', label: 'Durée cible (mois)', extract: (c) => c.platformProfile.targetHoldPeriodMonths },
  { key: 'acquisitionFee', label: "Frais d'entrée", extract: (c) => `${c.platformProfile.acquisitionFeePct} %` },
  { key: 'managementFee', label: 'Frais de gestion annuels', extract: (c) => `${c.platformProfile.annualManagementFeePct} %` },
  { key: 'incomeShare', label: 'Part investisseur (revenus)', extract: (c) => `${c.platformProfile.incomeShareInvestorPct} %` },
  { key: 'capitalGainShare', label: 'Part investisseur (plus-value)', extract: (c) => `${c.platformProfile.capitalGainShareInvestorPct} %` },
  { key: 'offer', label: 'Offre reçue', extract: (c) => c.offerSummary },
  { key: 'rejectionReason', label: 'Motif de refus', extract: (c) => c.rejectionReason },
];

export function computePlatformComparison(candidates: PlatformComparisonCandidateInput[]): PlatformComparisonResult {
  const candidateIds = candidates.map((c) => c.id);
  const candidateLabels = candidates.map((c) => c.platformProfile.platformName);

  const fixedRows: PlatformComparisonRow[] = FIXED_ROWS.map((def) => ({
    key: def.key,
    label: def.label,
    values: candidates.map((c) => def.extract(c) ?? null),
  }));

  // Critères négociés au cas par cas — union des clés déjà comparées pour au
  // moins une candidature, jamais une clé devinée. Une candidature qui n'a
  // pas encore ce critère renseigné affiche `null` ("à confirmer" côté UI),
  // distinct d'un critère non applicable.
  const criteriaKeys = new Set<string>();
  for (const c of candidates) {
    if (c.comparedCriteria) {
      for (const key of Object.keys(c.comparedCriteria)) criteriaKeys.add(key);
    }
  }
  const criteriaRows: PlatformComparisonRow[] = Array.from(criteriaKeys).map((key) => ({
    key: `criteria.${key}`,
    label: key,
    values: candidates.map((c) => {
      const value = c.comparedCriteria?.[key];
      if (value === undefined || value === null) return null;
      return typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value);
    }),
  }));

  return { candidateIds, candidateLabels, rows: [...fixedRows, ...criteriaRows] };
}
