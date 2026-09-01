export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export type DealType =
  | 'PROMOTION_IMMOBILIERE'
  | 'DIVISION_PARCELLAIRE'
  | 'DIVISION_FONCIERE'
  | 'MISE_EN_COPROPRIETE'
  | 'AMENAGEMENT_FONCIER'
  | 'MARCHAND_DE_BIENS_AVEC_TRAVAUX'
  | 'MARCHAND_DE_BIENS_SANS_TRAVAUX'
  | 'REFINANCEMENT_FONDS_PROPRES'
  | 'REFINANCEMENT_ACTIF'
  | 'REFINANCEMENT_STOCK';

export const DEAL_TYPES: DealType[] = [
  'PROMOTION_IMMOBILIERE',
  'DIVISION_PARCELLAIRE',
  'DIVISION_FONCIERE',
  'MISE_EN_COPROPRIETE',
  'AMENAGEMENT_FONCIER',
  'MARCHAND_DE_BIENS_AVEC_TRAVAUX',
  'MARCHAND_DE_BIENS_SANS_TRAVAUX',
  'REFINANCEMENT_FONDS_PROPRES',
  'REFINANCEMENT_ACTIF',
  'REFINANCEMENT_STOCK',
];

export type DealStage =
  | 'SOURCING'
  | 'ANALYSE'
  | 'COMITE'
  | 'MONTAGE'
  | 'COLLECTE'
  | 'FINANCE'
  | 'SUIVI'
  | 'REMBOURSE'
  | 'DEFAUT';

export type DealStatus = 'ACTIVE' | 'ON_HOLD' | 'CLOSED' | 'ARCHIVED';

export type DealRecoveryStatus = 'RAS' | 'AMIABLE' | 'MISE_EN_DEMEURE' | 'CONTENTIEUX' | 'PROCEDURE_COLLECTIVE';

export const DEAL_RECOVERY_STATUS_LABELS: Record<DealRecoveryStatus, string> = {
  RAS: 'RAS',
  AMIABLE: 'Amiable',
  MISE_EN_DEMEURE: 'Mise en demeure',
  CONTENTIEUX: 'Contentieux',
  PROCEDURE_COLLECTIVE: 'Procédure collective',
};

/** Textes d'aide affichés au survol des badges de situation juridique — indépendant du statut de surveillance ATLAS. */
export const DEAL_RECOVERY_STATUS_DESCRIPTIONS: Record<DealRecoveryStatus, string> = {
  RAS: "RAS = Rien À Signaler. Aucune procédure de recouvrement en cours sur ce dossier.",
  AMIABLE: "Échéance dépassée sans réaction du porteur — discussion à l'amiable en cours, pas encore de procédure formelle.",
  MISE_EN_DEMEURE: "Mise en demeure envoyée au porteur, action judiciaire pas encore engagée.",
  CONTENTIEUX: 'Action judiciaire engagée contre le porteur.',
  PROCEDURE_COLLECTIVE: 'Procédure collective (redressement ou liquidation judiciaire) ouverte chez le porteur.',
};

export type DealSurveillanceStatus = 'FAIBLE' | 'SOUS_SURVEILLANCE' | 'ELEVE' | 'CRITIQUE';

export const DEAL_SURVEILLANCE_STATUS_LABELS: Record<DealSurveillanceStatus, string> = {
  FAIBLE: 'Faible',
  SOUS_SURVEILLANCE: 'Sous surveillance',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

/** Textes d'aide affichés au survol des badges de statut de surveillance — calculé par le Risk Engine, indépendant de l'étape du projet ou du recouvrement. */
export const DEAL_SURVEILLANCE_STATUS_DESCRIPTIONS: Record<DealSurveillanceStatus, string> = {
  FAIBLE: 'Trajectoire conforme au scénario initial, aucun signal de dérive détecté.',
  SOUS_SURVEILLANCE: 'Premier niveau de vigilance — au moins un signal mérite un suivi renforcé, sans dégradation confirmée.',
  ELEVE: "Dégradation objective constatée sur plusieurs facteurs — score élevé, mais pas (encore) de fait dur avéré.",
  CRITIQUE: "Difficulté matérielle avérée (procédure collective, échéance en contentieux, garantie majeure expirée...) — jamais atteint par le seul score, toujours un fait constaté.",
};

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export const DEAL_STAGES: DealStage[] = [
  'SOURCING',
  'ANALYSE',
  'COMITE',
  'MONTAGE',
  'COLLECTE',
  'FINANCE',
  'SUIVI',
  'REMBOURSE',
  'DEFAUT',
];

const FINANCED_STAGES: ReadonlySet<DealStage> = new Set(['FINANCE', 'SUIVI', 'REMBOURSE', 'DEFAUT']);

/** Un prêt déjà décaissé (spec ATLAS v2, A.3bis) — bascule le stepper pipeline vers la frise du cycle de vie du prêt. */
export function isFinancedStage(stage: DealStage): boolean {
  return FINANCED_STAGES.has(stage);
}

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  SOURCING: 'Sourcing',
  ANALYSE: 'Analyse',
  COMITE: 'Comité',
  MONTAGE: 'Montage',
  COLLECTE: 'Collecte',
  FINANCE: 'Financé',
  SUIVI: 'Suivi',
  REMBOURSE: 'Remboursé',
  DEFAUT: 'Défaut',
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  ACTIVE: 'Active',
  ON_HOLD: 'En pause',
  CLOSED: 'Clôturée',
  ARCHIVED: 'Archivée',
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
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

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

export interface UserSummary {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role?: Role;
}

export interface CurrentUser extends UserSummary {
  email: string;
  role: Role;
  organizationId: string;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Tag {
  id: string;
  organizationId: string;
  name: string;
  color: string;
}

export interface DealTagLink {
  tagId: string;
  tag: Tag;
}

export interface Deal {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  type: DealType;
  stage: DealStage;
  status: DealStatus;
  description?: string | null;
  amountTarget: string;
  amountRaised: string;
  currency: string;
  interestRate?: string | null;
  durationMonths?: number | null;
  feesRate?: string | null;
  feesAmount?: string;
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  country: string;
  lat?: string | null;
  lng?: string | null;
  riskScore?: number | null;
  riskScorePrevious?: number | null;
  riskScoreUpdatedAt?: string | null;
  qualityScore?: number | null;
  performanceScore?: number | null;
  ewsScore?: number | null;
  surveillanceStatus?: DealSurveillanceStatus | null;
  chantierSignaleArret?: boolean;
  /** Capital restant dû — jamais stocké côté API, calculé à la volée (voir crd.util.ts). */
  crd?: number;
  /** Intérêts courus depuis le dernier remboursement réalisé — null si taux ou date de départ manquants (jamais fabriqué à 0). */
  crdInteretsCourus?: number | null;
  /** crd + crdInteretsCourus — null si crdInteretsCourus est null. */
  crdTotal?: number | null;
  /** Jours d'intérêts courus au taux majoré de pénalité de retard (+5 pts) depuis le déblocage des fonds — 0 si jamais hors-contrat, null si l'échéance contractuelle n'est pas connue. */
  crdJoursPenalisesRetard?: number | null;
  /** D.4 — TRI/multiple réalisés à partir des remboursements réels (jamais projetés). */
  realizedPerformance?: RealizedPerformance;
  startDate?: string | null;
  endDate?: string | null;
  dateMin?: string | null;
  dateCible?: string | null;
  dateMax?: string | null;
  dateEcheanceInitiale?: string | null;
  repaid: boolean;
  recoveryStatus: DealRecoveryStatus;
  porteurNom?: string | null;
  porteurSociete?: string | null;
  porteurAdresse?: string | null;
  porteurSiren?: string | null;
  porteurMonitoringStatus?: string | null;
  porteurCheckedAt?: string | null;
  riskDataCheckedAt?: string | null;
  dpeCheckedAt?: string | null;
  deadlineAlert?: DeadlineAlert;
  durationTargetAlert?: DurationTargetAlert;
  /** Un point Suivi cible a été enregistré assez récemment (depuis J-30 avant la durée cible) pour valider ce signal — la bannière correspondante disparaît de "Signaux & causes", sans effacer durationTargetAlert lui-même (toujours utilisé ailleurs, ex. score de risque). */
  durationTargetValidated?: boolean;
  checkpointHealth?: CheckpointHealth;
  createdById: string;
  createdBy?: UserSummary;
  assignedToId?: string | null;
  assignedTo?: UserSummary | null;
  tags: DealTagLink[];
  createdAt: string;
  updatedAt: string;
  _count?: { notes: number; documents: number; tasks: number };
}

export interface DealDetail extends Deal {
  notes: Note[];
  tasks: Task[];
  documents: DocumentFile[];
}

export interface NoteImage {
  id: string;
  url: string;
  mimeType: string;
}

export interface Note {
  id: string;
  dealId: string;
  authorId: string;
  author?: UserSummary;
  content: string;
  images: NoteImage[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  dealId?: string | null;
  deal?: { id: string; name: string; reference: string } | null;
  title: string;
  done: boolean;
  priority: Priority;
  dueDate?: string | null;
  assigneeId: string;
  assignee?: UserSummary;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface DocumentFile {
  id: string;
  dealId: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageDriver: string;
  uploadedById: string;
  uploadedBy?: UserSummary;
  createdAt: string;
}

export interface Alert {
  id: string;
  organizationId: string;
  dealId?: string | null;
  deal?: { id: string; name: string; reference: string } | null;
  articleId?: string | null;
  article?: { id: string; url: string | null } | null;
  severity: AlertSeverity;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  dealId: string;
  userId: string;
  user?: UserSummary;
  deal?: { id: string; name: string; reference: string };
  type: string;
  message: string;
  createdAt: string;
}

export interface FieldChange {
  id: string;
  dealId: string;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy?: { id: string; firstName: string; lastName: string } | null;
  sourceDocument?: { id: string; name: string } | null;
}

export interface OperatorConcentrationEntry {
  porteurSiren: string | null;
  porteurSociete: string | null;
  crd: number;
  dealCount: number;
  /** Exposition des dossiers liés à des entités du même groupe économique (B.3) — jamais fusionnée dans `crd`, toujours affichée à part. */
  groupEconomiqueAdditionalExposure?: number;
}

export interface CityExposureEntry {
  city: string;
  crd: number;
}

export interface StressTest {
  eleveExposure: number;
  assumedDefaultRate: number;
  potentialLoss: number;
}

export interface DealKpis {
  activeDeals: number;
  totalAum: number;
  totalRaised: number;
  /** Capital restant dû total (dossiers ACTIVE) — voir Deal.crd. */
  totalCrd: number;
  fundingProgress: number;
  averageInterestRate: number;
  lateDeals: number;
  byStage: Record<string, number>;
  byType: Record<string, number>;
  /** Somme du CRD par typologie (pas un comptage — voir byType ci-dessus). */
  exposureByType: Record<string, number>;
  /** Top 5 porteurs par CRD cumulé ; porteurSiren: null regroupé sous une entrée distincte. */
  topOperatorConcentration: OperatorConcentrationEntry[];
  /** Dossiers réellement actifs mais dont le statut a été mis manuellement hors ACTIVE — angle mort de monitoring. */
  statusMonitoringGaps: number;
  /** Somme du CRD par palier de surveillance — 'NON_CALCULE' pour un dossier sans score, jamais fusionné avec un vrai palier. */
  exposureByRiskTier: Record<string, number>;
  /** Top 8 villes par CRD cumulé ; 'Non renseignée' regroupée sous une entrée distincte. */
  exposureByCity: CityExposureEntry[];
  stressTest: StressTest;
}

/** Export structuré par dossier (spec ATLAS v2, A.11) — sous-ensemble stable destiné à un reporting fonds, distinct du payload complet de la fiche dossier. */
export interface DealReport {
  reportVersion: number;
  generatedAt: string;
  reference: string;
  name: string;
  type: DealType;
  stage: DealStage;
  status: string;
  location: { city: string | null; postcode: string | null };
  financials: {
    amountTarget: number;
    amountRaised: number;
    interestRate: number | null;
    crdCapital: number;
    crdInteretsCourus: number | null;
    crdTotal: number | null;
    crdJoursPenalisesRetard: number | null;
  };
  dates: {
    startDate: string | null;
    endDate: string | null;
    dateEcheanceInitiale: string | null;
    dateMax: string | null;
  };
  risk: {
    score: number | null;
    scorePrevious: number | null;
    surveillanceStatus: DealSurveillanceStatus | null;
  };
  recovery: {
    recoveryStatus: string;
    repaid: boolean;
  };
  actions: { openTasksCount: number };
  disclaimer: string;
}

/** Export structuré portefeuille (spec ATLAS v2, A.11) — mêmes agrégats que le dashboard cockpit (DealKpis), emballés pour un reporting fonds. */
export interface PortfolioReport {
  reportVersion: number;
  generatedAt: string;
  kpis: DealKpis;
  overdueTasks: { total: number; urgent: number };
  disclaimer: string;
}

// Frise du cycle de vie du prêt (spec ATLAS v2, A.3bis) — remplace le
// stepper pipeline sur les dossiers déjà financés (FINANCE/SUIVI/REMBOURSE/
// DEFAUT). Calculé côté API (loan-lifecycle.util.ts), jamais recalculé côté
// front — le front ne fait qu'afficher les segments reçus.
export type LoanLifecycleSegmentKind = 'NORMAL' | 'DEPASSEMENT' | 'HORS_CONTRAT' | 'PROROGE';

export interface LoanLifecycleSegment {
  kind: LoanLifecycleSegmentKind;
  start: string;
  end: string;
}

export type LoanLifecycleTerminalType = 'REMBOURSE' | 'DEFAUT' | 'PROCEDURE_COLLECTIVE';

export interface LoanLifecycleTerminal {
  type: LoanLifecycleTerminalType;
  date: string;
}

export type LoanLifecycle =
  | { status: 'INSUFFICIENT_DATA' }
  | {
      status: 'OK';
      dateDureeCible: string;
      segments: LoanLifecycleSegment[];
      terminal: LoanLifecycleTerminal | null;
      todayCursor: string | null;
      retardDays: number;
    };

export interface LoanExtension {
  id: string;
  dealId: string;
  dateSignature: string;
  nouvelleDateEcheance: string;
  createdAt: string;
}

export interface PipelineStage {
  stage: DealStage;
  count: number;
  totalAmount: number;
}

export type DeadlineLevel = 'RAS' | 'ATTENTION' | 'URGENT';

export interface DeadlineAlert {
  level: DeadlineLevel;
  daysToMax: number;
  stage: 'J90' | 'J60' | 'J30' | 'J15' | 'CONTENTIEUX' | null;
  actionLabel: string | null;
}

export interface DurationTargetAlert {
  level: 'RAS' | 'ATTENTION' | 'URGENT';
  targetDate: string | null;
  daysToTarget: number | null;
  stage: 'J30' | 'DEPASSEE' | null;
  actionLabel: string | null;
}

export interface DealDeadlineAlert extends DeadlineAlert {
  id: string;
  name: string;
  reference: string;
  dateMax: string | null;
}

export interface GuaranteeToRenew {
  id: string;
  dealId: string;
  dealName: string;
  dealReference: string;
  type: GuaranteeType;
  description: string;
  endDate: string | null;
  validity: GuaranteeValidity;
  invalidReason: GuaranteeInvalidReason;
  expiringSoon: boolean;
  daysToExpiry: number | null;
}

export type CheckpointHealthLevel = 'VERT' | 'ORANGE' | 'ROUGE';

export interface CheckpointHealth {
  level: CheckpointHealthLevel | null;
  reasons: string[];
  checkpointDate: string | null;
}

export interface FeesMonthPoint {
  month: number;
  amount: number;
}

export interface FeesSummary {
  year: number;
  monthly: FeesMonthPoint[];
  annualActual: number;
  annualTarget: number | null;
  progressPct: number | null;
}

export interface AumHistoryPoint {
  month: string;
  label: string;
  /** Vrai CRD historique reconstruit à partir des remboursements réalisés — peut redescendre (voir buildAumHistory()). */
  crd: number;
}

export interface CockpitSummary {
  generatedAt: string;
  kpis: DealKpis;
  today: Task[];
  priorities: Task[];
  agenda: Task[];
  alerts: Alert[];
  notifications: number;
  recentActivity: Activity[];
  pipeline: PipelineStage[];
  aumHistory: AumHistoryPoint[];
  deadlineAlerts: DealDeadlineAlert[];
  guaranteesToRenew: GuaranteeToRenew[];
  autoSummary: AutoSummary;
  decisions: DecisionRow[];
  overdueTasks: { total: number; urgent: number };
}

export interface DecisionRow {
  dealId: string;
  dealName: string;
  dealReference: string;
  tier: 'WATCH' | 'HIGH';
  score: number;
  previousScore: number | null;
  signalLabel: string;
  signalExplanation: string;
  exposition: number;
  daysToMax: number | null;
  deadlineActionLabel: string | null;
}

export interface AutoSummaryItem {
  label: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface AutoSummary {
  headline: string;
  items: AutoSummaryItem[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthResponse {
  user: CurrentUser;
  organization?: Organization;
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeToken: string;
}

export type LoginResult = AuthResponse | TwoFactorChallenge;

// ── Dossiers: guarantees & financial model ──────────────────

export type GuaranteeType = 'HYPOTHEQUE' | 'FIDUCIE' | 'CAUTION' | 'GAGE' | 'NANTISSEMENT' | 'PRIVILEGE' | 'AUTRE';
export type GuaranteeStatus = 'ACTIVE' | 'RELEASED' | 'DEFAULTED';
export type GuaranteeValidity = 'VALIDE' | 'NON_VALIDE';
/** Pourquoi une sûreté est NON_VALIDE (spec ATLAS v2, A.9) — purement informatif. */
export type GuaranteeInvalidReason = 'EXPIREE' | 'DEFAUT_DE_FOND' | null;

export const GUARANTEE_TYPE_LABELS: Record<GuaranteeType, string> = {
  HYPOTHEQUE: 'Hypothèque',
  FIDUCIE: 'Fiducie',
  CAUTION: 'Caution',
  GAGE: 'Gage',
  NANTISSEMENT: 'Nantissement',
  PRIVILEGE: 'Privilège',
  AUTRE: 'Autre',
};

export const GUARANTEE_STATUS_LABELS: Record<GuaranteeStatus, string> = {
  ACTIVE: 'Active',
  RELEASED: 'Levée',
  DEFAULTED: 'En défaut',
};

// Types qui portent une date de fin (hypothèque, fiducie, caution) — pilote
// l'affichage du champ date et le badge Valide/Non valide dans l'UI.
export const EXPIRABLE_GUARANTEE_TYPES: GuaranteeType[] = ['HYPOTHEQUE', 'FIDUCIE', 'CAUTION'];

export interface Guarantee {
  id: string;
  dealId: string;
  type: GuaranteeType;
  description: string;
  amount: string;
  rank: number;
  status: GuaranteeStatus;
  endDate?: string | null;
  verifiedAt?: string | null;
  /** Vice de fond signalé par un analyste (spec ATLAS v2, A.9) — jamais déduit d'une donnée existante. */
  substantiveDefect: boolean;
  substantiveDefectNote?: string | null;
  // Calculés côté serveur à partir de endDate/substantiveDefect — jamais saisis directement.
  validity: GuaranteeValidity;
  invalidReason: GuaranteeInvalidReason;
  expiringSoon: boolean;
  daysToExpiry: number | null;
  createdAt: string;
}

export type CommitteeStatus = 'PAS_DE_COMITE' | 'VALIDE' | 'CONDITIONS_SUSPENSIVES' | 'REFUSE';

export const COMMITTEE_STATUS_LABELS: Record<CommitteeStatus, string> = {
  PAS_DE_COMITE: 'Pas de comité',
  VALIDE: 'Validé',
  CONDITIONS_SUSPENSIVES: 'Conditions suspensives',
  REFUSE: 'Refusé',
};

export interface PipelineEntry {
  id: string;
  organizationId: string;
  date: string;
  operator: string;
  typology?: string | null;
  source?: string | null;
  amount: string;
  margin?: string | null;
  feesRate?: string | null;
  committee: CommitteeStatus;
  decision?: string | null;
  convertedDealId?: string | null;
  convertedDeal?: { id: string; name: string; reference: string } | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineSummary {
  received: number;
  totalAmount: number;
  validatedCount: number;
  validatedRate: number;
  toReviewCount: number;
  rejectedCount: number;
  convertedCount: number;
  bySource: { source: string; count: number }[];
  byTypology: { typology: string; count: number; amount: number }[];
}

export type NewsletterStatus = 'A_JOUR' | 'A_RELANCER' | 'CRITIQUE';

export const NEWSLETTER_STATUS_LABELS: Record<NewsletterStatus, string> = {
  A_JOUR: 'À jour',
  A_RELANCER: 'À relancer',
  CRITIQUE: 'Critique',
};

export interface NewsletterEntry {
  id: string;
  name: string;
  reference: string;
  lastNewsletterDate: string | null;
  newsletterTargetDays: number;
  daysSince: number | null;
  status: NewsletterStatus;
}

export interface Repayment {
  id: string;
  dealId: string;
  amount: string;
  date: string;
  projected: boolean;
  note?: string | null;
  createdAt: string;
}

export interface RepaymentsSummary {
  year: number;
  monthly: { month: number; actual: number; projected: number }[];
  totalActual: number;
  totalProjected: number;
}

export interface RepaymentWithDeal {
  id: string;
  amount: string;
  date: string;
  projected: boolean;
  note?: string | null;
  deal: { id: string; name: string; reference: string };
}

export interface FinancialAssumption {
  surfaceSqm: number;
  sellingPricePerSqm: number;
  targetMarginPct: number | null;
  notes: string | null;
  landPrice: number | null;
  notaryFees: number | null;
  diagnosticsCost: number | null;
  insuranceCost: number | null;
  propertyTaxCost: number | null;
  surveyStudiesCost: number | null;
  agencyFees: number | null;
  referralFees: number | null;
  bankMiscFees: number | null;
  lpbFeesPctHT: number | null;
  lpbTvaApplicable: boolean;
  lpbTvaRatePct: number | null;
  lpbDurationMinMonths: number | null;
  lpbDurationMaxMonths: number | null;
  latePenaltyApplied: boolean;
  bankName: string | null;
  bankLoanAcquisition: number | null;
  bankLoanAccompagnement: number | null;
  bankInterestRatePct: number | null;
  bankFileFees: number | null;
  bankGuaranteeFees: number | null;
}

export interface CostLineItem {
  id: string;
  label: string;
  amount: number;
  sortOrder: number;
}

export const SALE_LOT_STATUSES = ['EN_VENTE', 'OFFRE', 'PROMESSE_COMPROMIS', 'RESERVATION', 'VENDU'] as const;
export type SaleLotStatus = (typeof SALE_LOT_STATUSES)[number];

export const SALE_LOT_STATUS_LABELS: Record<SaleLotStatus, string> = {
  EN_VENTE: 'En vente',
  OFFRE: 'Offre',
  PROMESSE_COMPROMIS: 'Promesse/Compromis de vente',
  RESERVATION: 'Réservation',
  VENDU: 'Vendu',
};

export interface SaleLot {
  id: string;
  label: string;
  surfaceSqm: number;
  salePrice: number;
  status: SaleLotStatus;
  sortOrder: number;
}

export interface FinancialScenario {
  label: string;
  sellingPricePerSqm: number;
  constructionCostPerSqm: number;
  revenue: number;
  totalCost: number;
  margin: number;
  marginPct: number;
}

export interface FinancialSynthesis {
  foncierTotal: number;
  travauxTotal: number;
  honorairesTechniquesTotal: number;
  agencyFees: number;
  referralFees: number;
  bankMiscFees: number;
  lpb: {
    collecte: number;
    tauxPct: number;
    tauxPctEffectif: number;
    latePenaltyApplied: boolean;
    /** true si la pénalité est appliquée au calcul — reflète uniquement la case cochée par l'utilisateur, jamais automatique. */
    latePenaltyEffective: boolean;
    dureeCibleMonths: number;
    interestOnDurationCible: number;
    feesHT: number;
    feesTTC: number;
    guaranteeFeesEstimate: number;
    hasActiveHypotheque: boolean;
    totalFees: number;
    netDisbursed: number;
  };
  bank: { enabled: false } | { enabled: true; name: string; loanTotal: number; interestOnDurationCible: number; totalFees: number };
  coutDeRevient: number;
  prixDeVente: number;
  /** LOTS = somme de la grille de commercialisation, MOYENNE = sellingPricePerSqm × surfaceSqm (fallback tant qu'aucun lot n'est saisi). */
  prixDeVenteSource: 'LOTS' | 'MOYENNE';
  saleLotsSummary: {
    count: number;
    soldCount: number;
    totalSurfaceSqm: number;
    totalSalePrice: number;
    avgPricePerSqm: number | null;
  } | null;
  marge: number;
  margePct: number;
  expositionFinale: number;
  ratios: {
    lta: number | null;
    ltc: number | null;
    ltv: number | null;
    ltaAvecBanque: number | null;
    ltcAvecBanque: number | null;
    ltvAvecBanque: number | null;
  };
}

export interface BpComparisonLine {
  key: string;
  label: string;
  initial: number;
  current: number;
  deltaAbs: number;
  deltaPct: number | null;
  initialPct?: number;
  currentPct?: number;
}

export interface BpComparison {
  hasData: boolean;
  /** true une fois le BP initial figé via "Figer le BP initial" — sans quoi lines/sensitivity restent vides. */
  locked: boolean;
  lockedAt: string | null;
  lines: BpComparisonLine[];
  sensitivity: { initial: FinancialScenario[]; current: FinancialScenario[] } | null;
  marginAlert: { level: 'ATTENTION' | 'URGENT'; message: string } | null;
  disclaimer: string | null;
}

export interface FinancialModel {
  assumption: FinancialAssumption | null;
  travauxItems: CostLineItem[] | null;
  honorairesTechniquesItems: CostLineItem[] | null;
  saleLots: SaleLot[] | null;
  valuation: FinancialScenario | null;
  sensitivity: FinancialScenario[] | null;
  synthesis: FinancialSynthesis | null;
}

/** D.4 — indicateur de valorisation réalisé (TRI/multiple), calculé sur les remboursements réels. */
export interface RealizedPerformance {
  triRealisePct: number | null;
  multipleCapital: number | null;
  totalPercu: number;
  dureeReelleDetentionMois: number | null;
  tauxContractuelPct: number | null;
  ecartTriVsContractuelPts: number | null;
}

/** D.1 — module de sensibilité de scénario (investissement fonds). */
export interface ScenarioDeltas {
  tauxDeltaPts?: number;
  dureeDeltaMonths?: number;
  prixSortiePctDelta?: number;
  travauxPctDelta?: number;
  delaiCommercialisationMonths?: number;
}

export type ScenarioAxisVariable = keyof ScenarioDeltas;

export interface ScenarioResult {
  label: string;
  deltas: Required<ScenarioDeltas>;
  tauxEffectifPct: number;
  dureeCibleMonths: number;
  dureeEffectiveMonths: number;
  prixDeVente: number;
  coutDeRevient: number;
  marge: number;
  margePct: number;
  pointMortTotal: number;
  pointMortPerSqm: number | null;
  multipleCapital: number | null;
  triAnnuelPct: number | null;
}

export interface SensitivityMatrix {
  rowVariable: ScenarioAxisVariable;
  colVariable: ScenarioAxisVariable;
  rowValues: number[];
  colValues: number[];
  cells: ScenarioResult[][];
}

export interface ScenarioComputation {
  hasData: boolean;
  central: ScenarioResult | null;
  pessimiste: ScenarioResult | null;
  optimiste: ScenarioResult | null;
  custom: ScenarioResult | null;
  matrix: SensitivityMatrix | null;
}

export interface ProjectCheckpoint {
  id: string;
  dealId: string;
  recordedBy: { id: string; firstName: string; lastName: string };
  travauxBudgetInitial: number | null;
  travauxDepensesADate: number | null;
  travauxTermines: boolean;
  commercialisationLancee: boolean;
  pourcentageVendu: number | null;
  prixVenteInitialPrevu: number | null;
  prixVenteActualise: number | null;
  prixVenteReelADate: number | null;
  atterrissagePrevu: string | null;
  notes: string | null;
  deltaTravaux: number | null;
  deltaPrixActualise: number | null;
  deltaPrix: number | null;
  margeADate: number | null;
  createdAt: string;
}

// ── Risk Engine v3 (score additif unique) ─────────────────────

export interface TriggeredIndicator {
  key: string;
  label: string;
  points: number;
  explanation: string;
}

export interface RiskOverrideRow {
  ruleKey: string;
  label: string;
  minimumSurveillanceStatus: DealSurveillanceStatus;
  triggeredAt: string;
}

export interface AnalystOverride {
  overrideStatus: DealSurveillanceStatus;
  justification: string;
  createdAt: string;
  createdByName: string;
}

export interface DealRiskProfile {
  dealId: string;
  suppressed: boolean;
  computedAt: string;
  disclaimer: string;
  composite: {
    score: number | null;
    previousScore: number | null;
    trend: 'UP' | 'DOWN' | 'FLAT' | null;
    deltas: { d7: number | null; d30: number | null; d90: number | null };
  };
  triggered: TriggeredIndicator[];
  surveillance: {
    status: DealSurveillanceStatus | null;
    automaticStatus: DealSurveillanceStatus | null;
    velocity: { band: string; direction: string; delta90: number | null } | null;
    hardOverrides: RiskOverrideRow[];
    analystOverride: AnalystOverride | null;
  };
  cycleProjet: 'EN_COURS' | 'SORTIE' | 'REMBOURSEMENT' | 'CLOTURE';
  recoveryStatus: DealRecoveryStatus | null;
  completeness: { missingCount: number; missingItems: { key: string; label: string }[] } | null;
  dataFreshness: {
    sources: { key: string; label: string; checkedAt: string | null; upToDate: boolean }[];
    confidencePct: number | null;
  } | null;
  guaranteeProtection: string;
}

export interface RiskTrajectoryPoint {
  computedAt: string;
  compositeScore: number;
  surveillanceStatus: DealSurveillanceStatus;
}

export interface RiskIndicatorDefinition {
  key: string;
  label: string;
  maxPoints: number;
  rationale: string;
}

export interface HardOverrideRuleDefinition {
  key: string;
  label: string;
  minimumSurveillanceStatus: DealSurveillanceStatus;
}

export interface RiskMethodology {
  indicators: RiskIndicatorDefinition[];
  surveillanceBands: Record<DealSurveillanceStatus, string>;
  velocityWindowDays: number;
  velocityBands: { STABLE: string; DETERIORATION: string; DERIVE: string; DETERIORATION_RAPIDE: string };
  hardOverrideRules: HardOverrideRuleDefinition[];
  calibrationDisclaimer: string;
  disclaimer: string;
}

export interface RiskValidationGroup {
  count: number;
  averageScore: number | null;
  medianScore: number | null;
  tierDistribution: { SAFE: number; WATCH: number; HIGH: number };
}

export interface RiskValidationCase {
  dealId: string;
  reference: string;
  name: string;
  outcome: 'REMBOURSE' | 'DEFAUT';
  scoreAtClosure: number;
  closureDate: string;
}

export interface RiskModelValidation {
  totalCount: number;
  sampleTooSmall: boolean;
  outcomes: { REMBOURSE: RiskValidationGroup; DEFAUT: RiskValidationGroup };
  cases: RiskValidationCase[];
}

export interface DataValidation {
  id: string;
  dealId: string;
  entityType: string;
  validatedAt: string;
  validatedBy: { id: string; firstName: string; lastName: string };
}

// ── Knowledge Graph ──────────────────────────────────────────

export type GraphEntityType =
  | 'PROMOTEUR'
  | 'BANQUE'
  | 'NOTAIRE'
  | 'ARCHITECTE'
  | 'COLLECTIVITE'
  | 'INVESTISSEUR'
  | 'PLATEFORME';

export const GRAPH_ENTITY_TYPE_LABELS: Record<GraphEntityType, string> = {
  PROMOTEUR: 'Promoteur',
  BANQUE: 'Banque',
  NOTAIRE: 'Notaire',
  ARCHITECTE: 'Architecte',
  COLLECTIVITE: 'Collectivité',
  INVESTISSEUR: 'Investisseur',
  PLATEFORME: 'Plateforme',
};

export type DealEntityRole =
  | 'PROMOTEUR'
  | 'BANQUE_FINANCEUR'
  | 'NOTAIRE'
  | 'ARCHITECTE'
  | 'COLLECTIVITE'
  | 'INVESTISSEUR'
  | 'GARANT'
  | 'AUTRE';

export const DEAL_ENTITY_ROLE_LABELS: Record<DealEntityRole, string> = {
  PROMOTEUR: 'Promoteur',
  BANQUE_FINANCEUR: 'Banque financeuse',
  NOTAIRE: 'Notaire',
  ARCHITECTE: 'Architecte',
  COLLECTIVITE: 'Collectivité',
  INVESTISSEUR: 'Investisseur',
  GARANT: 'Garant',
  AUTRE: 'Autre',
};

export type GraphRelationType = 'PARTENAIRE' | 'FINANCEUR' | 'CONSEIL' | 'CONCURRENT' | 'AUTRE';

export interface GraphEntity {
  id: string;
  organizationId: string;
  type: GraphEntityType;
  name: string;
  description?: string | null;
  website?: string | null;
  city?: string | null;
  lat?: string | null;
  lng?: string | null;
  metadata?: Record<string, unknown> | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { dealLinks: number; relationsFrom: number; relationsTo: number };
}

export interface GraphEntityDetail extends GraphEntity {
  dealLinks: { id: string; role: DealEntityRole; deal: { id: string; name: string; reference: string; stage: DealStage } }[];
  relationsFrom: { id: string; type: GraphRelationType; label?: string | null; toEntity: GraphEntity }[];
  relationsTo: { id: string; type: GraphRelationType; label?: string | null; fromEntity: GraphEntity }[];
  articles: { article: Article }[];
}

/** Knowledge Graph v2 (spec ATLAS v2, section 0.2) — niveau de preuve/vérification, jamais un simple booléen. */
export type RelationshipCoverage = 'UNKNOWN' | 'PARTIAL' | 'SUBSTANTIAL' | 'VERIFIED';

export const RELATIONSHIP_COVERAGE_LABELS: Record<RelationshipCoverage, string> = {
  UNKNOWN: 'Inconnue',
  PARTIAL: 'Partielle',
  SUBSTANTIAL: 'Substantielle',
  VERIFIED: 'Vérifiée',
};

export type EvidenceLevel = 'DECLARED' | 'DOCUMENTED' | 'OFFICIAL';

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  DECLARED: 'Déclarée (sans document)',
  DOCUMENTED: 'Documentée',
  OFFICIAL: 'Officielle (source publique/légale)',
};

export interface RelationshipTypeOption {
  key: string;
  label: string;
  category: string;
  description: string | null;
}

/** Fiche contrepartie enrichie (spec ATLAS v2, B.3) — requêtes déterministes de premier niveau du Knowledge Graph v2. */
export interface EntitySummary {
  coverage: RelationshipCoverage;
  relationsCount: number;
  informationConfidence: RelationshipCoverage | null;
  lastVerifiedAt: string | null;
  exposureDirect: number | null;
  operationsActive: number;
  operationsRepaid: number;
  guaranteesSharedCount: number;
  groupEconomique: { id: string; name: string }[];
  exposureConsolidated: number | null;
  distressedLinked: { id: string; name: string; reason: string }[];
}

export type CompetitorProjectStatus = 'A_VENIR' | 'EN_COLLECTE' | 'CLOTURE';

export const COMPETITOR_PROJECT_STATUS_LABELS: Record<CompetitorProjectStatus, string> = {
  A_VENIR: 'À venir',
  EN_COLLECTE: 'En collecte',
  CLOTURE: 'Clôturé',
};

export interface CompetitorProject {
  id: string;
  entityId: string;
  name: string;
  status: CompetitorProjectStatus;
  targetAmount?: string | null;
  expectedDate?: string | null;
  url?: string | null;
  note?: string | null;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export type CompetitorProjectEventType = 'PROJECT_DETECTED' | 'FUNDING_OPENED' | 'FUNDING_CLOSED' | 'PROJECT_REMOVED' | 'PROJECT_UPDATED';

export const COMPETITOR_PROJECT_EVENT_LABELS: Record<CompetitorProjectEventType, string> = {
  PROJECT_DETECTED: 'Projet détecté',
  FUNDING_OPENED: 'Collecte ouverte',
  FUNDING_CLOSED: 'Collecte clôturée',
  PROJECT_REMOVED: 'Projet retiré',
  PROJECT_UPDATED: 'Projet mis à jour',
};

export interface CompetitorProjectEvent {
  id: string;
  entityId: string;
  projectId: string;
  projectName: string;
  eventType: CompetitorProjectEventType;
  previousStatus?: CompetitorProjectStatus | null;
  newStatus?: CompetitorProjectStatus | null;
  occurredAt: string;
}

export interface DealEntityLink {
  id: string;
  dealId: string;
  entityId: string;
  role: DealEntityRole;
  entity: GraphEntity;
}

export interface GraphNode {
  id: string;
  kind: 'entity' | 'deal';
  type: string;
  label: string;
  subtitle?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string | null;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Intelligence Marché ──────────────────────────────────────

export type ArticleCategory =
  | 'TAUX'
  | 'INFLATION'
  | 'CONSTRUCTION'
  | 'IMMOBILIER'
  | 'LOGISTIQUE'
  | 'COMMERCE'
  | 'RESIDENTIEL'
  | 'REGLEMENTATION'
  | 'CONCURRENCE'
  | 'AUTRE';

export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  TAUX: 'Taux',
  INFLATION: 'Inflation',
  CONSTRUCTION: 'Construction',
  IMMOBILIER: 'Immobilier',
  LOGISTIQUE: 'Logistique',
  COMMERCE: 'Commerce',
  RESIDENTIEL: 'Résidentiel',
  REGLEMENTATION: 'Réglementation',
  CONCURRENCE: 'Concurrence',
  AUTRE: 'Autre',
};

export type SourceHealth = 'OPERATIONAL' | 'DEGRADED' | 'BROKEN' | 'UNKNOWN';

export const SOURCE_HEALTH_LABELS: Record<SourceHealth, string> = {
  OPERATIONAL: 'Opérationnelle',
  DEGRADED: 'Dégradée',
  BROKEN: 'En panne',
  UNKNOWN: 'Inconnue',
};

export type SourceApprovalStatus = 'APPROVED_FOR_COLLECTION' | 'PENDING_REVIEW';

/** Source Registry (spec ATLAS v2, C.2/C.7) — un enregistrement par connecteur, partagé par tous les tenants. */
export interface SourceRegistryEntry {
  key: string;
  label: string;
  accessMethod: string;
  termsReviewed: boolean;
  reviewedAt?: string | null;
  authenticationRequired: boolean;
  approvalStatus: SourceApprovalStatus;
  lastCheckedAt?: string | null;
  lastSuccessAt?: string | null;
  health: SourceHealth;
  lastChangeAt?: string | null;
}

export interface SourceCoverage {
  sources: SourceRegistryEntry[];
  summary: { total: number; operational: number; degraded: number; broken: number };
}

/** Pilote Market Intelligence Engine (spec ATLAS v2, C.1-C.3) — observation automatisée d'un projet individuel sur une source pilote. */
export type ProjectObservationStatus = 'A_VENIR' | 'EN_COLLECTE' | 'CLOTURE' | 'RETIRE';

export const PROJECT_OBSERVATION_STATUS_LABELS: Record<ProjectObservationStatus, string> = {
  A_VENIR: 'À venir',
  EN_COLLECTE: 'En collecte',
  CLOTURE: 'Clôturé',
  RETIRE: 'Retiré',
};

export interface ProjectObservation {
  id: string;
  sourceKey: string;
  platform: string;
  projectName: string;
  projectUrl: string;
  operatorRaw: string | null;
  amountTarget: number | null;
  ratePct: number | null;
  durationMonths: number | null;
  sourceCategory: string | null;
  atlasSegment: string | null;
  mappingConfidence: string | null;
  location: string | null;
  status: ProjectObservationStatus;
  observedAt: string;
  updatedAt: string;
}

export type MarketObservationEventType = 'PROJECT_DETECTED' | 'FUNDING_OPENED' | 'FUNDING_CLOSED' | 'PROJECT_REMOVED' | 'PROJECT_UPDATED';

export const MARKET_OBSERVATION_EVENT_LABELS: Record<MarketObservationEventType, string> = {
  PROJECT_DETECTED: 'Projet détecté',
  FUNDING_OPENED: 'Collecte ouverte',
  FUNDING_CLOSED: 'Collecte clôturée',
  PROJECT_REMOVED: 'Projet retiré',
  PROJECT_UPDATED: 'Projet mis à jour',
};

export interface MarketObservationEvent {
  id: string;
  sourceKey: string;
  projectUrl: string;
  projectName: string;
  eventType: MarketObservationEventType;
  previousStatus: ProjectObservationStatus | null;
  newStatus: ProjectObservationStatus | null;
  occurredAt: string;
}

export interface NewsSource {
  id: string;
  organizationId: string;
  name: string;
  connector: string;
  url?: string | null;
  active: boolean;
  lastFetchedAt?: string | null;
  createdAt: string;
}

export interface Article {
  id: string;
  organizationId: string;
  sourceId: string;
  source?: { id: string; name: string; connector: string };
  title: string;
  summary?: string | null;
  url?: string | null;
  category: ArticleCategory;
  publishedAt: string;
  priority: Priority;
  createdAt: string;
}

export interface ConnectorInfo {
  key: string;
  label: string;
}

// ── Agents IA ─────────────────────────────────────────────────

export interface AgentInfo {
  key: string;
  name: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentHistoryMessage extends ChatMessage {
  source?: 'devil';
}

// Mirrors the Fiche Produit section of the audit classeur — see
// apps/api/src/agents/agents.service.ts FinancialExtractionSchema.
export interface FinancialExtraction {
  coutDeRevientTotal: number | null;
  chiffreAffairesTotal: number | null;
  margeEuros: number | null;
  margePct: number | null;
  surfaceM2: number | null;
  prixAcquisitionM2: number | null;
  coutTravauxM2: number | null;
  montantTravaux: number | null;
  aleasTravauxPct: number | null;
  prixSortieM2: number | null;
  tauxInteretPct: number | null;
  dureeMinMois: number | null;
  dureeCibleMois: number | null;
  dureeMaxMois: number | null;
  apportPdp: number | null;
  montantBanque: number | null;
  garanties: string | null;
  notes: string;
  marginBand: 'vert' | 'jaune' | 'orange' | 'rouge' | null;
  sourceDocument: string;
  documentId: string;
}
