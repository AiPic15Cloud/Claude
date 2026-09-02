export interface PlatformMetadata {
  category?: string | null;
  source?: string;
  fetchedAt?: string;
  isTerminated?: boolean | null;
  totalFunded?: number | null;
  projectCountFinanced?: number | null;
  capitalReimbursed?: number | null;
  projectCountReimbursed?: number | null;
  riskAmount?: number | null;
  riskRatePct?: number | null;
  riskProjects?: number | null;
  capitalInDefault?: number | null;
  lastReportDate?: string | null;
  averageLoanDuration?: number | null;
  // Score du baromètre-crowdfunding.com, jamais un score Atlas natif (cf.
  // principe 0.4 de la spec ATLAS v2) — toujours affiché avec son
  // attribution explicite ("Score externe"), jamais comme "Score" seul.
  externalScore?: number | null;
  // Manually-tracked competitive-watch fields — distinct from `category`
  // (the barometer's sector taxonomy above) because it answers a different
  // question: does this platform sell fractional/rental ownership, or is it
  // classic crowdfunding (fixed-term bonds, no real ownership, no recurring
  // yield)? Never inferred from the name — only set when actually verified.
  businessModel?: 'FRACTIONNE' | 'CROWDFUNDING' | null;
  country?: string | null;
  verificationStatus?: 'ACTIF' | 'PIVOTE' | 'LIQUIDE' | 'REDRESSEMENT' | 'A_VERIFIER' | null;
  verificationNote?: string | null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  'real-estate': 'Immobilier',
  'renewable-energy': 'Énergies renouvelables',
  crowdlending: 'Crowdlending',
  other: 'Autre',
};

export const BUSINESS_MODEL_LABELS: Record<string, string> = {
  FRACTIONNE: 'Fractionné locatif',
  CROWDFUNDING: 'Crowdfunding classique',
};

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  ACTIF: 'Actif',
  PIVOTE: 'Pivoté',
  LIQUIDE: 'Liquidé',
  REDRESSEMENT: 'Redressement judiciaire',
  A_VERIFIER: 'À vérifier',
};

export const VERIFICATION_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  ACTIF: 'success',
  PIVOTE: 'warning',
  LIQUIDE: 'destructive',
  REDRESSEMENT: 'destructive',
  A_VERIFIER: 'warning',
};
