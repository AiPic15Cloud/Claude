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
  riskProjects?: number | null;
  capitalInDefault?: number | null;
  lastReportDate?: string | null;
  averageLoanDuration?: number | null;
  atlasScore?: number | null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  'real-estate': 'Immobilier',
  'renewable-energy': 'Énergies renouvelables',
  crowdlending: 'Crowdlending',
  other: 'Autre',
};
