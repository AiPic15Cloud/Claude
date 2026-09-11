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

/**
 * OUTPERFORMING/RECOVERY : valeurs retirées du modèle live (migration
 * 20260830195946_surveillance_status_4_paliers) mais que l'historique de
 * trajectoire (RiskTrajectoryPoint, jamais réécrit) peut encore renvoyer pour
 * un point antérieur à cette date — jamais pour Deal.surveillanceStatus
 * lui-même (toujours l'une des 4 valeurs courantes). Ne jamais proposer ces
 * deux valeurs dans un sélecteur ou un nouveau statut.
 */
export type DealSurveillanceStatus = 'FAIBLE' | 'SOUS_SURVEILLANCE' | 'ELEVE' | 'CRITIQUE' | 'OUTPERFORMING' | 'RECOVERY';

export const DEAL_SURVEILLANCE_STATUS_LABELS: Record<DealSurveillanceStatus, string> = {
  FAIBLE: 'Faible',
  SOUS_SURVEILLANCE: 'Sous surveillance',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
  OUTPERFORMING: 'Faible (historique)',
  RECOVERY: 'Sous surveillance (historique)',
};

/** Textes d'aide affichés au survol des badges de statut de surveillance — calculé par le Risk Engine, indépendant de l'étape du projet ou du recouvrement. */
export const DEAL_SURVEILLANCE_STATUS_DESCRIPTIONS: Record<DealSurveillanceStatus, string> = {
  FAIBLE: 'Trajectoire conforme au scénario initial, aucun signal de dérive détecté.',
  SOUS_SURVEILLANCE: 'Premier niveau de vigilance — au moins un signal mérite un suivi renforcé, sans dégradation confirmée.',
  ELEVE: "Dégradation objective constatée sur plusieurs facteurs — score élevé, mais pas (encore) de fait dur avéré.",
  CRITIQUE: "Difficulté matérielle avérée (procédure collective, échéance en contentieux, garantie majeure expirée...) — jamais atteint par le seul score, toujours un fait constaté.",
  OUTPERFORMING: "Ancien palier, équivalent à Faible — visible uniquement sur un point de trajectoire antérieur au 30/08/2026.",
  RECOVERY: "Ancien palier, équivalent à Sous surveillance — visible uniquement sur un point de trajectoire antérieur au 30/08/2026.",
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
  /** F.3 — LTV/ICR/DSCR calculés à partir du CRD et du modèle financier. */
  covenants?: Covenants;
  /** D.3 — recalculée à chaque lecture à partir des 5 champs ESG éditables (esg-completeness.util.ts). */
  esgCompleteness?: EsgCompleteness;
  /** F.2 — déclencheur "Perte" du dashboard portefeuille, décision manuelle de l'analyste. */
  perteDefinitiveActee?: boolean;
  perteDefinitiveNote?: string | null;
  perteDefinitiveDate?: string | null;
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
  esgMateriauxBasCarbone?: EsgAssessment | null;
  esgGestionEauxPluviales?: string | null;
  esgEmploisChantierEstimes?: number | null;
  esgAccessibilite?: string | null;
  esgConformiteReglementaire?: EsgAssessment | null;
  esgNotes?: string | null;
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

export type TaskType = 'REPORTING' | 'FINANCE' | 'JURIDIQUE' | 'COMMERCIALISATION' | 'SUIVI_CIBLE' | 'AUTRE';

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  REPORTING: 'Reporting',
  FINANCE: 'Finance',
  JURIDIQUE: 'Juridique',
  COMMERCIALISATION: 'Commercialisation',
  SUIVI_CIBLE: 'Suivi cible',
  AUTRE: 'Autre',
};

export interface Task {
  id: string;
  dealId?: string | null;
  deal?: { id: string; name: string; reference: string } | null;
  title: string;
  done: boolean;
  inProgress: boolean;
  priority: Priority;
  typeTache: TaskType;
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

/**
 * Dashboard portefeuille agrégé (spec ATLAS v2, module MARKO F.2) —
 * "Actif" = stage SUIVI uniquement (sous-ensemble plus étroit que
 * DealKpis.activeDeals, qui couvre tous les stades du statut ACTIVE).
 * Volontairement sans bloc "Objectif Sortie (24 mois)" ni TRI sous
 * "Actif" — ni l'un ni l'autre n'a de calcul défini par la spec.
 */
export interface PortfolioOverview {
  actif: { count: number; totalCrd: number };
  perte: { count: number; totalCrd: number };
  sortiRembourse: { count: number; totalAmount: number; triMoyenPct: number | null };
  scoreRisqueMoyenPondere: number | null;
  repartitionParPalier: Record<string, { count: number; crd: number }>;
  /** D.3 — moyenne non pondérée sur les dossiers actifs (tous stades) ; suivi personnel, jamais un indicateur de qualité d'actif. */
  esgCompletenessMoyenne: { pct: number | null; count: number };
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
  /** Covenants ICR/DSCR (spec ATLAS v2, module MARKO F.3) — saisie manuelle. */
  resultatOperationnelEstime: number | null;
  fluxTresorerieDisponibleEstime: number | null;
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

/** D.3 — dimension ESG (spec complémentaire), réponse à une case oui/non/inconnu. */
export type EsgAssessment = 'OUI' | 'NON' | 'INCONNU';
export const ESG_ASSESSMENT_LABELS: Record<EsgAssessment, string> = {
  OUI: 'Oui',
  NON: 'Non',
  INCONNU: 'Inconnu',
};

/** D.2 — comparables internes (note d'investissement) : autres dossiers du portefeuille, même ville ou même typologie. */
export interface ComparableDeal {
  id: string;
  reference: string;
  name: string;
  type: DealType;
  city: string | null;
  amountTarget: string;
  interestRate: string | null;
  stage: DealStage;
  riskScore: number | null;
  repaid: boolean;
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

/** F.3 — ratios de covenant (LTV directement applicable ; ICR/DSCR nécessitent une saisie manuelle, pertinence à juger au cas par cas). */
/** D.3 — complétude du bloc ESG : mesure l'effort de documentation, jamais la qualité de l'actif. */
export interface EsgCompleteness {
  filled: number;
  total: number;
  pct: number;
  environnement: { filled: number; total: number };
  social: { filled: number; total: number };
  gouvernance: { filled: number; total: number };
}

export interface Covenants {
  ltvPct: number | null;
  ltvThresholdPct: number;
  ltvBreached: boolean | null;
  icr: number | null;
  icrThreshold: number;
  icrBreached: boolean | null;
  dscr: number | null;
  dscrThreshold: number;
  dscrBreached: boolean | null;
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

/** Market Relationship & Contagion Intelligence V2, §9 — journal d'événements juridiques par entité. */
export type LegalEventType =
  | 'REDRESSEMENT_JUDICIAIRE'
  | 'LIQUIDATION_JUDICIAIRE'
  | 'SAUVEGARDE'
  | 'DISSOLUTION'
  | 'RADIATION'
  | 'CHANGEMENT_DIRIGEANT'
  | 'CHANGEMENT_CONTROLE'
  | 'AUTRE';

export const LEGAL_EVENT_TYPE_LABELS: Record<LegalEventType, string> = {
  REDRESSEMENT_JUDICIAIRE: 'Redressement judiciaire',
  LIQUIDATION_JUDICIAIRE: 'Liquidation judiciaire',
  SAUVEGARDE: 'Procédure de sauvegarde',
  DISSOLUTION: 'Dissolution',
  RADIATION: 'Radiation',
  CHANGEMENT_DIRIGEANT: 'Changement de dirigeant',
  CHANGEMENT_CONTROLE: 'Changement de contrôle',
  AUTRE: 'Autre événement juridique',
};

export interface LegalEvent {
  id: string;
  entityId: string;
  type: LegalEventType;
  source: string;
  reference?: string | null;
  note?: string | null;
  occurredAt?: string | null;
  detectedAt: string;
  createdAt: string;
}

/** Market Relationship & Contagion Intelligence V2, §10 — classe de lien entre l'entité affectée et le dossier analysé. */
export type ContagionProximity = 'DIRECT' | 'CONTROLE_GROUPE' | 'OPERATEUR' | 'HISTORIQUE';

export const CONTAGION_PROXIMITY_LABELS: Record<ContagionProximity, string> = {
  DIRECT: 'Direct (porteur du dossier)',
  CONTROLE_GROUPE: 'Groupe économique',
  OPERATEUR: 'Opérateur commun',
  HISTORIQUE: 'Lien historique',
};

export type ContagionSignalStatus = 'OPEN' | 'ACKNOWLEDGED' | 'DISMISSED';

export interface ContagionSignal {
  id: string;
  dealId: string;
  sourceEntity: { id: string; name: string };
  legalEvent: LegalEvent | null;
  financialEvent: { id: string; type: string } | null;
  proximity: ContagionProximity;
  contagionDemonstrated: boolean;
  additionalExposure?: string | null;
  explanation: string;
  status: ContagionSignalStatus;
  createdAt: string;
  resolvedAt?: string | null;
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

// ── Fractionné — Underwriting institutionnel (spec V3.0 + patch V3.2) ──────
// Onglet Atlas de premier niveau, distinct du Pipeline/Portefeuille LPB
// (patch V3.2 §1) — voir apps/api/src/fractional/ pour le détail du
// périmètre P0 livré et des lots différés (P1/P2).

export type FractionalProjectStatus =
  | 'ANALYSE'
  | 'STRUCTURATION'
  | 'VALIDATION_PLATEFORME'
  | 'COLLECTE'
  | 'ACQUISITION'
  | 'EXPLOITATION'
  | 'SORTIE'
  | 'REFUSE'
  | 'ABANDONNE';

export const FRACTIONAL_PROJECT_STATUS_LABELS: Record<FractionalProjectStatus, string> = {
  ANALYSE: 'Analyse',
  STRUCTURATION: 'Structuration',
  VALIDATION_PLATEFORME: 'Validation plateforme',
  COLLECTE: 'Collecte',
  ACQUISITION: 'Acquisition',
  EXPLOITATION: 'Exploitation',
  SORTIE: 'Sortie',
  REFUSE: 'Refusé',
  ABANDONNE: 'Abandonné',
};

export type FractionalIndexationType = 'ILC' | 'ILAT' | 'IRL' | 'ICC' | 'AUTRE';
export type FractionalLeaseRenewalStatus = 'SIGNE' | 'EN_COURS' | 'TACITE' | 'DEPASSE' | 'CONTESTE';
export const FRACTIONAL_LEASE_RENEWAL_STATUS_LABELS: Record<FractionalLeaseRenewalStatus, string> = {
  SIGNE: 'Signé',
  EN_COURS: 'En cours',
  TACITE: 'Tacite',
  DEPASSE: 'Dépassé',
  CONTESTE: 'Contesté',
};

export type FractionalCapexResponsable = 'PROPRIETAIRE' | 'LOCATAIRE';
export type FractionalValuationMethod = 'CAPITALISATION' | 'DCF' | 'COMPARABLE_SALES' | 'COST_REPLACEMENT' | 'EXTERNAL_APPRAISAL';
export const FRACTIONAL_VALUATION_METHOD_LABELS: Record<FractionalValuationMethod, string> = {
  CAPITALISATION: 'Capitalisation',
  DCF: 'DCF',
  COMPARABLE_SALES: 'Comparables (ventes)',
  COST_REPLACEMENT: 'Coût de remplacement',
  EXTERNAL_APPRAISAL: 'Expertise indépendante',
};
export type FractionalVehicleInstrumentType = 'OBLIGATION' | 'ACTION' | 'AUTRE';
export type FractionalAssumptionScenario = 'BASE' | 'BEAR' | 'SEVERE' | 'CUSTOM';

export interface FractionalProject {
  id: string;
  organizationId: string;
  createdById: string;
  name: string;
  reference: string;
  status: FractionalProjectStatus;
  groupKey?: string | null;
  perimeterLabel?: string | null;
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  country: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { leases: number; capexItems: number; valuations: number };
  createdBy?: { firstName: string; lastName: string } | null;
}

export interface FractionalSourcesUses {
  id: string;
  projectId: string;
  prixNetVendeur: number;
  droitsNotaire: number;
  honoraires: number;
  travauxInitiaux: number;
  capexDiffereReserve: number;
  fraisPlateformeEntree: number;
  reserveVacance: number;
  reserveTravaux: number;
  reserveTresorerie: number;
  collecteMontant: number;
  sponsorEquity: number;
  detteEventuelle: number;
  autresSources: number;
}

export interface FractionalLease {
  id: string;
  projectId: string;
  tenantName: string;
  lotLabel?: string | null;
  surfaceM2?: number | null;
  dateEffet: string;
  dateTerme: string;
  breakDates?: string[] | null;
  loyerFacialAnnuel: number;
  ervAnnuel?: number | null;
  indexation: FractionalIndexationType;
  indexationCapPct?: number | null;
  indexationFloorPct?: number | null;
  franchiseMois: number;
  chargesRecuperables: boolean;
  depotGarantieMontant?: number | null;
  statutRenouvellement: FractionalLeaseRenewalStatus;
  restrictionsCessionSousLocation?: string | null;
  repartitionTravaux?: string | null;
  impayesNotes?: string | null;
  notes?: string | null;
  sirenLocataire?: string | null;
  procedureCollective: boolean;
  garantieMaisonMere: boolean;
  caLocataireAnnuel?: number | null;
  ebitdaLocataireAnnuel?: number | null;
  tresorerieLocataire?: number | null;
  exerciceFinancierAsOf?: string | null;
}

export interface FractionalCapexItem {
  id: string;
  projectId: string;
  annee: number;
  montant: number;
  nature: string;
  responsable: FractionalCapexResponsable;
  notes?: string | null;
}

export interface FractionalValuation {
  id: string;
  projectId: string;
  method: FractionalValuationMethod;
  value: number;
  capRatePct?: number | null;
  asOfDate: string;
  source?: string | null;
  notes?: string | null;
}

export interface PlatformFractionalProfile {
  id: string;
  organizationId: string;
  platformName: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  minNetInvestorYieldPct: number;
  targetHoldPeriodMonths?: number | null;
  eligibleLocations?: string | null;
  strategyConstraints?: string | null;
  acquisitionFeePct: number;
  annualManagementFeePct: number;
  incomeShareInvestorPct: number;
  capitalGainShareInvestorPct: number;
  appraisalRule?: string | null;
  earlyExitRule?: string | null;
  source?: string | null;
  confidence?: string | null;
}

export interface FractionalVehicleStructure {
  id: string;
  projectId: string;
  platformProfileId?: string | null;
  platformProfile?: PlatformFractionalProfile | null;
  spvName?: string | null;
  instrumentType: FractionalVehicleInstrumentType;
  nominal?: number | null;
  maturity?: string | null;
  amortization?: string | null;
  governanceNotes?: string | null;
}

export interface FractionalAssumptionSet {
  id: string;
  projectId: string;
  scenario: FractionalAssumptionScenario;
  version: number;
  label?: string | null;
  values: Record<string, unknown>;
}

export interface FractionalProjectDetail extends FractionalProject {
  sourcesUses?: FractionalSourcesUses | null;
  leases: FractionalLease[];
  capexItems: FractionalCapexItem[];
  valuations: FractionalValuation[];
  vehicleStructure?: FractionalVehicleStructure | null;
  assumptionSets: FractionalAssumptionSet[];
  stakeholders: FractionalStakeholder[];
  waterfallTiers: FractionalWaterfallTier[];
  icDecisions: FractionalICDecision[];
  actuals: FractionalProjectActual[];
  outcome?: FractionalProjectOutcome | null;
}

export type LeaseSecurityStatus = 'SECURED' | 'WATCH' | 'SECURE_BEFORE_ACQUISITION' | 'EXCLUDE_FROM_SECURED_YIELD';
export const LEASE_SECURITY_STATUS_LABELS: Record<LeaseSecurityStatus, string> = {
  SECURED: 'Sécurisé',
  WATCH: 'À surveiller',
  SECURE_BEFORE_ACQUISITION: 'À sécuriser avant acquisition',
  EXCLUDE_FROM_SECURED_YIELD: 'Exclu du rendement sécurisé',
};

export interface LeaseAssessment {
  leaseId: string;
  tenantName: string;
  weightPct: number;
  monthsToNextBreakOrTerm: number;
  securityStatus: LeaseSecurityStatus;
  reasons: string[];
}

export interface FractionalOperatingModelYear {
  year: number;
  grossPotentialRent: number;
  vacancyCreditLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  capex: number;
  platformVehicleCosts: number;
  distributableCashFlow: number;
  investorDistribution: number;
}

export interface FractionalReturnsResult {
  sourcesUsesResult: { coutActeEnMain: number; coutTotal: number; sourcesTotal: number; deltaSourcesUses: number; balanced: boolean };
  leaseSecurity: {
    assessments: LeaseAssessment[];
    walbYears: number | null;
    waltYears: number | null;
    totalLoyerFacial: number;
    securedRentPct: number;
    rentAtRiskPct: number;
    expiryWallByYear: Record<number, number>;
  };
  yearlyModel: FractionalOperatingModelYear[];
  terminalProceeds: { netSaleProceeds: number; capitalGain: number; investorTerminalProceeds: number };
  grossYieldPct: number;
  grossYieldAiPct: number;
  netPropertyYieldPct: number;
  investorNetYieldPct: number;
  securedNetYieldPct: number;
  yieldOnCostPct: number;
  irrPct: number | null;
  equityMultiple: number | null;
}

export type EligibilityVerdict = 'ELIGIBLE' | 'MARGINAL' | 'INELIGIBLE';
export const ELIGIBILITY_VERDICT_LABELS: Record<EligibilityVerdict, string> = {
  ELIGIBLE: 'Éligible',
  MARGINAL: 'Marginal',
  INELIGIBLE: 'Non éligible',
};

export interface ReverseSolverResult {
  value: number | null;
  achievedYieldPct: number | null;
  iterations: number;
}

export interface FractionalDCFYearCashFlow {
  year: number;
  propertyLevelCashFlow: number;
  discountFactor: number;
  presentValue: number;
}

export interface FractionalDCFValuation {
  discountRatePct: number;
  yearlyCashFlows: FractionalDCFYearCashFlow[];
  presentValueOfCashFlows: number;
  terminalValue: number;
  presentValueOfTerminalValue: number;
  totalValue: number;
}

export interface FractionalSynthese {
  base: FractionalReturnsResult;
  stressed: FractionalReturnsResult;
  stressedIsFallback: boolean;
  eligibility: { verdict: EligibilityVerdict; hurdlePct: number; securedNetYieldPct: number; gapPct: number };
  reverseSolver: { maxAcquisitionPrice: ReverseSolverResult; minSecuredRent: ReverseSolverResult } | null;
  hurdlePct: number;
  platformProfile: PlatformFractionalProfile | null;
  dcfValuation: FractionalDCFValuation;
}

// ── Deal Economics & Stakeholder Waterfall (spec V3.1 §29, P0 critique) ────

export type StakeholderRole = 'INVESTOR' | 'PLATFORM' | 'SPONSOR' | 'ARRANGER' | 'ASSET_MANAGER' | 'PROPERTY_MANAGER' | 'LENDER' | 'ADVISOR' | 'OTHER';
export const STAKEHOLDER_ROLE_LABELS: Record<StakeholderRole, string> = {
  INVESTOR: 'Investisseurs',
  PLATFORM: 'Plateforme',
  SPONSOR: 'Sponsor / opérateur',
  ARRANGER: 'Arrangeur',
  ASSET_MANAGER: 'Asset manager',
  PROPERTY_MANAGER: 'Property manager',
  LENDER: 'Prêteur',
  ADVISOR: 'Conseil',
  OTHER: 'Autre',
};

export type FeeType = 'ENTRY' | 'RUNNING' | 'TRANSACTION' | 'FINANCING' | 'EXIT' | 'CARRY' | 'REVENUE_SHARE' | 'CAPITAL_GAIN_SHARE';
export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  ENTRY: "Frais d'entrée",
  RUNNING: 'Frais courants',
  TRANSACTION: 'Frais de transaction',
  FINANCING: 'Frais de financement',
  EXIT: 'Frais de sortie',
  CARRY: 'Carried interest',
  REVENUE_SHARE: 'Quote-part revenus',
  CAPITAL_GAIN_SHARE: 'Quote-part plus-value',
};

export type FeeCalculationBase = 'PRIX_NET_VENDEUR' | 'COUT_TOTAL' | 'GAV' | 'NAV' | 'LOYERS_BRUTS' | 'LOYERS_NETS' | 'NOI' | 'CAPITAL_COLLECTE' | 'PLUS_VALUE' | 'AUTRE';
export const FEE_CALCULATION_BASE_LABELS: Record<FeeCalculationBase, string> = {
  PRIX_NET_VENDEUR: 'Prix net vendeur',
  COUT_TOTAL: 'Coût total',
  GAV: 'GAV',
  NAV: 'NAV',
  LOYERS_BRUTS: 'Loyers bruts',
  LOYERS_NETS: 'Loyers nets',
  NOI: 'NOI',
  CAPITAL_COLLECTE: 'Capital collecté',
  PLUS_VALUE: 'Plus-value',
  AUTRE: 'Autre',
};

export type WaterfallTierType = 'PREFERRED_RETURN' | 'RETURN_OF_CAPITAL' | 'CATCH_UP' | 'CARRIED_INTEREST' | 'RESIDUAL_SPLIT';
export const WATERFALL_TIER_TYPE_LABELS: Record<WaterfallTierType, string> = {
  PREFERRED_RETURN: 'Preferred return',
  RETURN_OF_CAPITAL: 'Retour de capital',
  CATCH_UP: 'Catch-up',
  CARRIED_INTEREST: 'Carried interest',
  RESIDUAL_SPLIT: 'Répartition résiduelle',
};

export interface FractionalStakeholder {
  id: string;
  projectId: string;
  role: StakeholderRole;
  name: string;
  notes?: string | null;
  capitalEngaged?: number | null;
  feeDefinitions?: FractionalFeeDefinition[];
}

export interface FractionalFeeDefinition {
  id: string;
  projectId: string;
  stakeholderId: string;
  feeType: FeeType;
  ratePct?: number | null;
  fixedAmount?: number | null;
  calculationBase: FeeCalculationBase;
  startYear?: number | null;
  endYear?: number | null;
}

export interface FractionalWaterfallTier {
  id: string;
  projectId: string;
  beneficiaryStakeholderId?: string | null;
  order: number;
  type: WaterfallTierType;
  hurdleRatePct?: number | null;
  catchUpPct?: number | null;
  sharePct?: number | null;
  notes?: string | null;
}

export interface StakeholderReceipt {
  year: number;
  category: 'FEE' | 'PREFERRED_RETURN' | 'RETURN_OF_CAPITAL' | 'CATCH_UP' | 'CARRIED_INTEREST' | 'RESIDUAL_SPLIT';
  amount: number;
}

export interface StakeholderResult {
  stakeholderId: string;
  name: string;
  role: StakeholderRole;
  capitalEngaged: number | null;
  totalFeeIncome: number;
  totalWaterfallIncome: number;
  totalReceipts: number;
  netProfit: number | null;
  irrPct: number | null;
  multiple: number | null;
  receipts: StakeholderReceipt[];
}

export interface StakeholderWaterfallResult {
  stakeholders: StakeholderResult[];
  totalFeeLoadPct: number;
  valueCaptureRatio: Record<string, number>;
  reconciled: boolean;
  unallocatedAmount: number;
  alignment: {
    sponsorEquityRatioPct: number | null;
    feeVsSponsorEquityRatioPct: number | null;
    carrySubordinatedToHurdle: boolean | null;
  };
}

export interface StakeholderReverseSolverResult {
  value: number | null;
  achievedInvestorIrrPct: number | null;
}

export interface FractionalDealEconomics {
  result: StakeholderWaterfallResult;
  reverseSolver: { maxTotalFeeLoad: StakeholderReverseSolverResult; maxCarry: StakeholderReverseSolverResult } | null;
  hurdlePct: number;
}

// ── P1 — Stress Testing, IC Engine, Investment Memory, Comparables ─────────

export type StressScenarioKey =
  | 'BASE'
  | 'RENT_DOWNSIDE'
  | 'VACANCY'
  | 'TENANT_DEFAULT'
  | 'CAPEX_OVERRUN'
  | 'OPEX_INCREASE'
  | 'EXIT_YIELD_EXPANSION'
  | 'VALUE_DECLINE'
  | 'PLATFORM_FEES_INCREASE'
  | 'COMBINED_SEVERE';

export const STRESS_SCENARIO_LABELS: Record<StressScenarioKey, string> = {
  BASE: 'Base',
  RENT_DOWNSIDE: 'Baisse des loyers',
  VACANCY: 'Vacance',
  TENANT_DEFAULT: 'Défaut locataire',
  CAPEX_OVERRUN: 'Dépassement CAPEX',
  OPEX_INCREASE: 'Hausse des charges',
  EXIT_YIELD_EXPANSION: 'Expansion exit yield',
  VALUE_DECLINE: 'Baisse de valeur',
  PLATFORM_FEES_INCREASE: 'Hausse frais plateforme',
  COMBINED_SEVERE: 'Combiné sévère',
};

export interface StressScenarioResult {
  scenario: StressScenarioKey;
  noi: number;
  investorNetYieldPct: number;
  securedNetYieldPct: number;
  irrPct: number | null;
  equityMultiple: number | null;
  exitValue: number;
  maxLoss: number;
  yearsUnderHurdle: number;
  eligibility: { verdict: EligibilityVerdict; hurdlePct: number; securedNetYieldPct: number; gapPct: number };
}

export type ICDecisionStatus = 'APPROVE' | 'APPROVE_SUBJECT_TO_CONDITIONS' | 'RESTRUCTURE' | 'HOLD' | 'DECLINE';
export const IC_DECISION_STATUS_LABELS: Record<ICDecisionStatus, string> = {
  APPROVE: 'Approuvé',
  APPROVE_SUBJECT_TO_CONDITIONS: 'Approuvé sous conditions',
  RESTRUCTURE: 'À restructurer',
  HOLD: 'En attente',
  DECLINE: 'Refusé',
};

export interface ICRecommendation {
  status: ICDecisionStatus;
  hardStops: string[];
  conditions: string[];
  watchItems: string[];
  recommendation: string;
}

export interface FractionalICDecision {
  id: string;
  projectId: string;
  status: ICDecisionStatus;
  hardStops: string[];
  conditions: string[];
  watchItems: string[];
  recommendation?: string | null;
  version: number;
  decidedAt: string;
}

export type ProjectOutcomeStatus = 'SUCCES' | 'SOUS_PERFORMANCE' | 'PERTE' | 'REFUSE' | 'ABANDONNE';
export const PROJECT_OUTCOME_STATUS_LABELS: Record<ProjectOutcomeStatus, string> = {
  SUCCES: 'Succès',
  SOUS_PERFORMANCE: 'Sous-performance',
  PERTE: 'Perte',
  REFUSE: 'Refusé',
  ABANDONNE: 'Abandonné',
};

export interface FractionalProjectActual {
  id: string;
  projectId: string;
  period: string;
  loyersReels?: number | null;
  occupationPct?: number | null;
  opexReel?: number | null;
  capexReel?: number | null;
  distributionsReelles?: number | null;
  valorisationReelle?: number | null;
  notes?: string | null;
}

export interface FractionalProjectOutcome {
  id: string;
  projectId: string;
  status: ProjectOutcomeStatus;
  triRealise?: number | null;
  multipleRealise?: number | null;
  notes?: string | null;
}

export interface PerformanceAttributionResult {
  period: string;
  loyerVariance: number | null;
  opexVariance: number | null;
  capexVariance: number | null;
  distributionVarianceTotal: number | null;
  autresFacteurs: number | null;
  summary: string;
}

export interface ComparableResult {
  projectId: string;
  name: string;
  city: string | null;
  status: string;
  prixNetVendeur: number | null;
  grossYieldPct: number | null;
  similarityScore: number;
}

export interface DealEconomicsScenarioResult {
  scenario: StressScenarioKey;
  result: StakeholderWaterfallResult;
}

// ── Module juridique — recommandations qualité des baux ────────────────────

export type LegalRecommendationSeverity = 'INFO' | 'WATCH' | 'ALERT' | 'CRITIQUE';

export interface LegalRecommendation {
  code: string;
  severity: LegalRecommendationSeverity;
  message: string;
}

export interface LeaseLegalReview {
  leaseId: string;
  tenantName: string;
  recommendations: LegalRecommendation[];
  worstSeverity: LegalRecommendationSeverity;
}

// ── Marché — RentIndexSeries & MarketComparablePool (patch V3.2 §2) ────────
// Données partagées au niveau organisation, jamais dupliquées par dossier.

export type RentIndexType = 'ILC' | 'ILAT' | 'IRL' | 'ICC';

export const RENT_INDEX_TYPE_LABELS: Record<RentIndexType, string> = {
  ILC: 'ILC',
  ILAT: 'ILAT',
  IRL: 'IRL',
  ICC: 'ICC',
};

export type MarketComparableType = 'LOYER' | 'VENTE';

export const MARKET_COMPARABLE_TYPE_LABELS: Record<MarketComparableType, string> = {
  LOYER: 'Loyer',
  VENTE: 'Vente',
};

export interface RentIndexSeries {
  id: string;
  organizationId: string;
  indexType: RentIndexType;
  period: string;
  value: number;
  cagr5y: number | null;
  cagr10y: number | null;
  asOfDate: string;
  source: string | null;
  createdAt: string;
}

export interface MarketComparablePool {
  id: string;
  organizationId: string;
  commune: string;
  secteur: string | null;
  type: MarketComparableType;
  valeurM2: number | null;
  yieldPct: number | null;
  surfaceM2: number | null;
  asOfDate: string;
  source: string;
  addedByProjectId: string | null;
  notes: string | null;
  createdAt: string;
}
