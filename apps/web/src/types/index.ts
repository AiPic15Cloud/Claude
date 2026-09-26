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

export type DealRepaymentMode = 'MENSUEL' | 'IN_FINE';
export const DEAL_REPAYMENT_MODE_LABELS: Record<DealRepaymentMode, string> = { MENSUEL: 'Mensuel', IN_FINE: 'In fine' };

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
  repaymentMode?: DealRepaymentMode | null;
  interestPaymentDay?: number | null;
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
  estimatedHours?: number | null;
  milestoneId?: string | null;
}

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'AT_RISK' | 'BLOCKED' | 'DONE' | 'WAIVED';

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: 'À faire',
  IN_PROGRESS: 'En cours',
  AT_RISK: 'À risque',
  BLOCKED: 'Bloqué',
  DONE: 'Fait',
  WAIVED: 'Levé sans action',
};

export interface PortfolioMilestone {
  id: string;
  dealId: string;
  organizationId: string;
  label: string;
  description?: string | null;
  targetDate?: string | null;
  status: MilestoneStatus;
  blocking: boolean;
  order: number;
  sourceFindingId?: string | null;
  createdById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: { id: string; title: string; done: boolean }[];
}

/** Avancement composite du dossier (jalons + tâches) — voir project-milestones/progress.util.ts côté API. */
export interface ProjectProgress {
  progressPct: number | null;
  milestonesTotal: number;
  milestonesDone: number;
  blockingOpenCount: number;
  tasksTotal: number;
  tasksDone: number;
}

/** Une ligne par analyste ayant au moins une tâche ouverte (GET /workload), triée par openCount décroissant côté API. */
export interface WorkloadEntry {
  assigneeId: string;
  assigneeName: string;
  openCount: number;
  overdueCount: number;
  estimatedHoursTotal: number;
  unestimatedCount: number;
  byPriority: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', number>;
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
  fractionalProjectId?: string | null;
  fractionalProject?: { id: string; name: string; reference: string } | null;
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

export interface InterestPayment {
  id: string;
  dealId: string;
  paidDate: string;
  amount?: string | null;
  note?: string | null;
  createdAt: string;
}

export type InterestPaymentLevel = 'RAS' | 'DUE_SOON' | 'OVERDUE';
export const INTEREST_PAYMENT_LEVEL_LABELS: Record<InterestPaymentLevel, string> = {
  RAS: 'À jour',
  DUE_SOON: 'Échéance proche',
  OVERDUE: 'En retard',
};

export interface InterestPaymentStatus {
  currentDueDate: string;
  daysOverdue: number;
  level: InterestPaymentLevel;
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
  marginPct: number | null;
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
  margePct: number | null;
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
  margePct: number | null;
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

/** Veille crowdfunding (spec ATLAS v2, C.1-C.9 + spec Lot 1) — évolution du pilote Market Intelligence Engine. */
export type ProjectObservationStatus = 'A_VENIR' | 'EN_COLLECTE' | 'CLOTURE' | 'RETIRE';

export const PROJECT_OBSERVATION_STATUS_LABELS: Record<ProjectObservationStatus, string> = {
  A_VENIR: 'À venir',
  EN_COLLECTE: 'En collecte',
  CLOTURE: 'Clôturé',
  RETIRE: 'Retiré',
};

export type CrowdfundingConnectorStatus = 'OPERATIONAL' | 'PARTIAL' | 'BLOCKED' | 'TO_BUILD';

export const CROWDFUNDING_CONNECTOR_STATUS_LABELS: Record<CrowdfundingConnectorStatus, string> = {
  OPERATIONAL: 'Opérationnel',
  PARTIAL: 'Partiel',
  BLOCKED: 'Bloqué',
  TO_BUILD: 'À développer',
};

/** Registre extensible des plateformes (spec §1) — jamais présentée comme "opérationnelle" tant que connectorStatus ne l'est pas explicitement. */
export interface CrowdfundingPlatform {
  sourceKey: string;
  label: string;
  platformName: string;
  country: string;
  listingUrl: string | null;
  accessMethod: string;
  connectorStatus: CrowdfundingConnectorStatus;
  authenticationRequiredForDocuments: boolean;
  coverageNotes: string | null;
  targetCheckFrequencySeconds: number;
  effectiveCheckFrequencySeconds: number | null;
  baselineCompletedAt: string | null;
  registryEntry?: SourceRegistryEntry;
}

export type EntityLinkMatchType = 'DIRECT_ID' | 'DOCUMENTED' | 'POTENTIAL';
export type EntityLinkConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type EntityLinkStatus = 'SUGGESTED' | 'CONFIRMED' | 'REJECTED';

/** Indicateur 3-états du rapprochement porteur Atlas (spec §4) — "aucun lien" n'est jamais une certitude d'absence, seulement l'état d'un rapprochement déjà tenté. */
export type AtlasLinkIndicator = 'confirme' | 'potentiel' | 'aucun_lien' | 'non_analyse';

export function computeAtlasLinkIndicator(links: { status: EntityLinkStatus }[] | undefined, enrichedAt: string | null): AtlasLinkIndicator {
  const active = (links ?? []).filter((l) => l.status !== 'REJECTED');
  if (active.some((l) => l.status === 'CONFIRMED')) return 'confirme';
  if (active.length > 0) return 'potentiel';
  return enrichedAt ? 'aucun_lien' : 'non_analyse';
}

export const ATLAS_LINK_INDICATOR_LABELS: Record<AtlasLinkIndicator, string> = {
  confirme: 'Porteur Atlas impliqué : confirmé',
  potentiel: 'Porteur Atlas impliqué : potentiel',
  aucun_lien: 'Aucun lien identifié',
  non_analyse: 'Pas encore analysé',
};

export interface ProjectObservationEntityLink {
  id: string;
  organizationId: string;
  observationId: string;
  entityId: string;
  matchType: EntityLinkMatchType;
  confidence: EntityLinkConfidence;
  status: EntityLinkStatus;
  relationshipId: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  observation?: { id: string; projectName: string; projectUrl: string; sourceKey: string; status: ProjectObservationStatus };
  entity?: { id: string; name: string; type: string };
}

export interface ProjectObservation {
  id: string;
  sourceKey: string;
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
  publishedAt: string | null;
  announcedOpeningAt: string | null;
  effectiveOpeningAt: string | null;
  firstDetectedAt: string;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  isBaseline: boolean;
  enrichedAt: string | null;
  observedAt: string;
  updatedAt: string;
  platform?: { platformName: string; connectorStatus: CrowdfundingConnectorStatus };
  /** Forme complète (id/matchType/entity) sur /observations/:id, forme allégée (status/confidence) sur /observations — computeAtlasLinkIndicator accepte les deux. */
  entityLinks?: { id: string; matchType: EntityLinkMatchType; status: EntityLinkStatus; confidence: EntityLinkConfidence; entity?: { id: string; name: string; type: string } }[];
  snapshots?: { id: string; data: Record<string, unknown>; observedAt: string }[];
}

export type MarketObservationEventType = 'PROJECT_DETECTED' | 'FUNDING_OPENED' | 'FUNDING_CLOSED' | 'PROJECT_REMOVED' | 'PROJECT_UPDATED';

export const MARKET_OBSERVATION_EVENT_LABELS: Record<MarketObservationEventType, string> = {
  PROJECT_DETECTED: 'Nouvelle collecte annoncée',
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
  isBaseline: boolean;
  discoveredAlreadyOpen: boolean;
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
  regimeTva: TvaRegime;
  tvaTauxPct: number | null;
  tvaRecuperationDelaiMois: number | null;
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
    leaseCoverageRatio: number | null;
    renewalDependencyPct: number;
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
  /** Écart de TRI (pts) imputable au seul décalage de trésorerie TVA (tva-cashflow.util.ts) — null si aucun régime PRIX_TOTAL_OPTION_LOYERS n'est modélisé. */
  irrImpactFromTvaTimingPts: number | null;
  incomeReturnPct: number;
  capitalReturnPct: number;
  totalReturnPct: number;
  yieldDependency: {
    rentContributionEur: number;
    indexationContributionEur: number;
    resaleContributionEur: number;
    totalPerformanceEur: number;
    rentSharePct: number | null;
    indexationSharePct: number | null;
    resaleSharePct: number | null;
  };
}

export type EligibilityVerdict = 'ELIGIBLE' | 'MARGINAL' | 'INELIGIBLE' | 'NOT_EVALUABLE';
export const ELIGIBILITY_VERDICT_LABELS: Record<EligibilityVerdict, string> = {
  ELIGIBLE: 'Éligible',
  MARGINAL: 'Marginal',
  INELIGIBLE: 'Non éligible',
  // Générique : NOT_EVALUABLE recouvre deux causes distinctes (pas de profil
  // plateforme, ou collecte non renseignée) — voir EligibilityResult.notEvaluableReason
  // et le bandeau contextuel affiché à côté du badge (synthese-tab.tsx).
  NOT_EVALUABLE: 'Non évaluable',
};
export type EligibilityNotEvaluableReason = 'NO_PLATFORM_PROFILE' | 'NO_COLLECTE';
export interface EligibilityResult {
  verdict: EligibilityVerdict;
  hurdlePct: number | null;
  securedNetYieldPct: number | null;
  gapPct: number | null;
  notEvaluableReason: EligibilityNotEvaluableReason | null;
}

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
  eligibility: EligibilityResult;
  reverseSolver: {
    maxAcquisitionPrice: ReverseSolverResult;
    minSecuredRent: ReverseSolverResult;
    maxVacancyCreditLossPct: ReverseSolverResult;
    maxAdditionalCapex: ReverseSolverResult;
    leasesToSecure: { leasesToSecure: { leaseId: string; tenantName: string; weightPct: number }[] | null; achievedYieldPct: number };
  } | null;
  hurdlePct: number;
  platformProfile: PlatformFractionalProfile | null;
  dcfValuation: FractionalDCFValuation;
  /** Data Integrity (spec V2 §10 "Unknown ≠ Zero") — aucune ligne CAPEX saisie, distinct d'un CAPEX confirmé à zéro. */
  capexDataMissing: boolean;
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

/**
 * Break Event Engine (spec V2 §9) — scénarios distincts des 10 ci-dessus :
 * déclenchés à la prochaine échéance de break réelle de chaque bail (vacance
 * + CAPEX de relocation + relocation à loyer réduit), pas une perturbation
 * générique appliquée dès l'année 1. Renvoyés par le même endpoint stress
 * tests (fractional-projects.service.ts computeStressTests), affichés dans
 * la même table.
 */
export type BreakStressScenarioKey = 'TENANT_BREAK_DOWNSIDE' | 'TENANT_BREAK_SEVERE';

export const STRESS_SCENARIO_LABELS: Record<StressScenarioKey | BreakStressScenarioKey, string> = {
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
  TENANT_BREAK_DOWNSIDE: 'Départ locataire au break',
  TENANT_BREAK_SEVERE: 'Départ locataire au break (sévère)',
};

export interface StressScenarioResult {
  scenario: StressScenarioKey | BreakStressScenarioKey;
  noi: number;
  investorNetYieldPct: number;
  securedNetYieldPct: number;
  irrPct: number | null;
  equityMultiple: number | null;
  exitValue: number;
  maxLoss: number;
  /** `null` si aucun profil plateforme n'est rattaché — hurdle non évaluable (cf. EligibilityResult). */
  yearsUnderHurdle: number | null;
  eligibility: EligibilityResult;
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
  /** Date de sortie réelle — absente tant que la sortie n'est pas intervenue. */
  exitDate?: string | null;
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

// ── Scoring pondéré + règles éliminatoires nommées (Complément H, points 1/8) ──

export interface FractionalScoreBucket {
  id: string;
  criterionId: string;
  label: string;
  points: number;
  isEliminatory: boolean;
  sortOrder: number;
}

export interface FractionalScoreCriterion {
  id: string;
  categoryId: string;
  label: string;
  sourceField: string | null;
  sortOrder: number;
  buckets: FractionalScoreBucket[];
}

export interface FractionalScoreCategory {
  id: string;
  organizationId: string;
  assetType: string | null;
  label: string;
  maxPoints: number;
  sortOrder: number;
  criteria: FractionalScoreCriterion[];
}

export type EliminatoryComparisonOperator = 'GTE' | 'LTE' | 'GT' | 'LT' | 'EQ';
export const ELIMINATORY_OPERATOR_LABELS: Record<EliminatoryComparisonOperator, string> = { GTE: '≥', LTE: '≤', GT: '>', LT: '<', EQ: '=' };

export type EliminatoryMetricKey =
  | 'SECURED_NET_YIELD_PCT'
  | 'INVESTOR_NET_YIELD_PCT'
  | 'GROSS_YIELD_PCT'
  | 'WALB_YEARS'
  | 'WALT_YEARS'
  | 'IRR_PCT'
  | 'EQUITY_MULTIPLE'
  | 'SOURCES_USES_BALANCED';

export const ELIMINATORY_METRIC_LABELS: Record<EliminatoryMetricKey, string> = {
  SECURED_NET_YIELD_PCT: 'Secured Net Yield (%)',
  INVESTOR_NET_YIELD_PCT: 'Investor Net Yield (%)',
  GROSS_YIELD_PCT: 'Gross Yield (%)',
  WALB_YEARS: 'WALB (années)',
  WALT_YEARS: 'WALT (années)',
  IRR_PCT: 'TRI (%)',
  EQUITY_MULTIPLE: 'Equity Multiple (x)',
  SOURCES_USES_BALANCED: 'Sources = Uses',
};

export interface FractionalEliminatoryRule {
  id: string;
  organizationId: string;
  assetType: string | null;
  platformProfileId: string | null;
  label: string;
  metricKey: EliminatoryMetricKey;
  operator: EliminatoryComparisonOperator;
  threshold: number;
  failMessage: string;
  sortOrder: number;
}

export interface FractionalBareme {
  resolvedAssetType: string | null;
  categories: FractionalScoreCategory[];
  eliminatoryRules: FractionalEliminatoryRule[];
}

export type ScoreTierVerdict = 'NO_GO' | 'CONDITIONNEL' | 'GO' | 'GO_FORT';
export const SCORE_TIER_VERDICT_LABELS: Record<ScoreTierVerdict, string> = {
  NO_GO: 'NO GO',
  CONDITIONNEL: 'Conditionnel',
  GO: 'GO',
  GO_FORT: 'GO fort',
};

export interface ScoreCategoryBreakdown {
  categoryId: string;
  label: string;
  points: number;
  maxPoints: number;
  pct: number;
}

export interface EliminatoryRuleResult {
  ruleId: string;
  label: string;
  metricKey: EliminatoryMetricKey;
  observedValue: number | null;
  operator: EliminatoryComparisonOperator;
  threshold: number;
  passed: boolean;
  unverifiable: boolean;
  failMessage: string | null;
}

export interface FitAssessmentResult {
  score: {
    totalPoints: number;
    maxPoints: number;
    pct: number;
    categoryBreakdown: ScoreCategoryBreakdown[];
    unansweredCriterionIds: string[];
  };
  scoreVerdict: ScoreTierVerdict;
  eliminatoryResults: EliminatoryRuleResult[];
  finalVerdict: ScoreTierVerdict;
  supplantedByEliminatoryRule: boolean;
  hasUnverifiableRule: boolean;
}

export interface FractionalScoreAssessment {
  id: string;
  projectId: string;
  scoredById: string | null;
  scoredAt: string;
  totalPoints: number;
  maxPoints: number;
  categoryBreakdown: ScoreCategoryBreakdown[];
  eliminatoryResults: EliminatoryRuleResult[];
  finalVerdict: ScoreTierVerdict;
}

export interface SubmitScoreAssessmentResponse {
  assessment: FractionalScoreAssessment;
  result: FitAssessmentResult;
}

// ── Data Integrity Engine — provenance généralisée (V3.1 §3, V2 §3) ────────

export type ProvenanceSourceLevel =
  | 'LEVEL_A_LEGAL_EXECUTED'
  | 'LEVEL_B_THIRD_PARTY_VERIFIED'
  | 'LEVEL_C_INVESTMENT_OPERATOR_DOCUMENT'
  | 'LEVEL_D_DECLARATIVE'
  | 'LEVEL_E_ATLAS_ASSUMPTION';

export const PROVENANCE_SOURCE_LEVEL_LABELS: Record<ProvenanceSourceLevel, string> = {
  LEVEL_A_LEGAL_EXECUTED: 'A — Légal / exécuté',
  LEVEL_B_THIRD_PARTY_VERIFIED: 'B — Tiers vérifié',
  LEVEL_C_INVESTMENT_OPERATOR_DOCUMENT: "C — Document opérateur",
  LEVEL_D_DECLARATIVE: 'D — Déclaratif',
  LEVEL_E_ATLAS_ASSUMPTION: 'E — Hypothèse Atlas',
};

export type ProvenanceVerificationStatus = 'UNVERIFIED' | 'CROSS_CHECKED' | 'VERIFIED' | 'CONFLICTING';
export const PROVENANCE_VERIFICATION_STATUS_LABELS: Record<ProvenanceVerificationStatus, string> = {
  UNVERIFIED: 'Non vérifié',
  CROSS_CHECKED: 'Recoupé',
  VERIFIED: 'Vérifié',
  CONFLICTING: 'Contradictoire',
};

export type ProvenanceConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export const PROVENANCE_CONFIDENCE_LABELS: Record<ProvenanceConfidence, string> = { LOW: 'Faible', MEDIUM: 'Moyenne', HIGH: 'Haute' };

export interface FractionalDataProvenance {
  id: string;
  projectId: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
  sourceLevel: ProvenanceSourceLevel;
  sourceReference: string | null;
  asOfDate: string | null;
  observedAt: string;
  verificationStatus: ProvenanceVerificationStatus;
  confidence: ProvenanceConfidence;
  ownerId: string | null;
  isOverride: boolean;
  overrideJustification: string | null;
  version: number;
}

export interface DataConfidenceFieldResult {
  entityType: string;
  entityId: string;
  fieldKey: string;
  label: string;
  scorePct: number;
  status: 'MISSING' | ProvenanceVerificationStatus;
}

export interface DataConfidenceResult {
  scorePct: number;
  fieldScores: DataConfidenceFieldResult[];
  missingCount: number;
  totalCount: number;
}

// ── Cap Rate Build-Up + TVA (Complément H, H.3) ─────────────────────────────

export type PropertyConditionTier = 'CORE' | 'CORE_PLUS' | 'VALUE_ADD' | 'OPPORTUNISTE' | 'DISTRESSED';
export const PROPERTY_CONDITION_LABELS: Record<PropertyConditionTier, string> = {
  CORE: 'Core',
  CORE_PLUS: 'Core+',
  VALUE_ADD: 'Value-add',
  OPPORTUNISTE: 'Opportuniste',
  DISTRESSED: 'Distressed',
};

export type LocationTier = 'PARIS_QCA' | 'SECONDAIRE' | 'TERTIAIRE_A' | 'TERTIAIRE_B' | 'TERTIAIRE_C';
export const LOCATION_TIER_LABELS: Record<LocationTier, string> = {
  PARIS_QCA: 'Paris QCA',
  SECONDAIRE: 'Secondaire',
  TERTIAIRE_A: 'Tertiaire A',
  TERTIAIRE_B: 'Tertiaire B',
  TERTIAIRE_C: 'Tertiaire C',
};

export type MarketDepth = 'PROFOND' | 'MOYEN' | 'FAIBLE';
export const MARKET_DEPTH_LABELS: Record<MarketDepth, string> = { PROFOND: 'Profond', MOYEN: 'Moyen', FAIBLE: 'Faible' };

export interface CapRateBuildUpResult {
  tec10Pct: number;
  conditionPremiumPct: number;
  locationPremiumPct: number;
  liquidityPremiumPct: number;
  esgPremiumPct: number;
  capRatePct: number;
}

export interface CapRateComparisonResult {
  buildUp: CapRateBuildUpResult;
  impliedCapRatePct: number;
  gapPts: number;
}

export type CapRateBuildUpResponse =
  | { status: 'NOT_QUALIFIED' }
  | { status: 'TEC10_MISSING' }
  | { status: 'OK'; tec10Source: 'OVERRIDE' | 'LIVE'; tec10AsOf: string | null; entry: CapRateComparisonResult; exit: CapRateComparisonResult };

export type ExitYieldScenario = 'BASE' | 'BEAR' | 'SEVERE';
export const EXIT_YIELD_SCENARIO_LABELS: Record<ExitYieldScenario, string> = { BASE: 'Base', BEAR: 'Bear', SEVERE: 'Severe' };

export interface ExitYieldScenarioResult {
  scenario: ExitYieldScenario;
  exitYieldPct: number;
  impliedExitValueEur: number | null;
  valueDeltaEur: number | null;
  valueDeltaPct: number | null;
}

export interface CapRateSensitivityPoint {
  deltaBps: number;
  exitYieldPct: number;
  impliedExitValueEur: number | null;
  valueDeltaEur: number | null;
  valueDeltaPct: number | null;
}

export interface NoiSensitivityPoint {
  noiDeltaPct: number;
  noiEur: number;
  impliedExitValueEur: number | null;
  valueDeltaEur: number | null;
  valueDeltaPct: number | null;
}

export type ExitYieldResponse =
  | { status: 'NOT_QUALIFIED' }
  | { status: 'TEC10_MISSING' }
  | {
      status: 'OK';
      entryYieldPct: number;
      marketYieldPct: number | null;
      scenarios: ExitYieldScenarioResult[];
      capRateSensitivity: CapRateSensitivityPoint[];
      noiSensitivity: NoiSensitivityPoint[];
      maxExitYieldExpansion: ReverseSolverResult | null;
    };

export type TvaRegime = 'NON_ASSUJETTI' | 'MARGE' | 'PRIX_TOTAL_OPTION_LOYERS';
export const TVA_REGIME_LABELS: Record<TvaRegime, string> = {
  NON_ASSUJETTI: 'Non assujetti',
  MARGE: 'TVA sur la marge',
  PRIX_TOTAL_OPTION_LOYERS: 'TVA sur le prix (option loyers)',
};

// ── Rental Reversion Engine (spec V3.1 §9) ──────────────────────────────────

export type ReversionStatus = 'OVER_RENTED' | 'AT_MARKET' | 'UNDER_RENTED' | 'ERV_MISSING';
export const REVERSION_STATUS_LABELS: Record<ReversionStatus, string> = {
  OVER_RENTED: 'Sur-loué (au-dessus du marché)',
  AT_MARKET: 'Au marché',
  UNDER_RENTED: 'Sous-loué (réserve de hausse)',
  ERV_MISSING: 'ERV non renseignée',
};

export interface LeaseReversionResult {
  leaseId: string;
  tenantName: string;
  passingRent: number;
  ervAnnuel: number | null;
  reversionPct: number | null;
  status: ReversionStatus;
}

export interface PortfolioReversionResult {
  leases: LeaseReversionResult[];
  weightedReversionPct: number | null;
  overRentedCount: number;
  atMarketCount: number;
  underRentedCount: number;
  ervMissingCount: number;
  totalCount: number;
  rentPctErvMissing: number;
}

// ── Tenant Replacement Cost Engine (spec V3.1 §10) ──────────────────────────

export interface TenantReplacementCostBreakdown {
  leaseId: string;
  tenantName: string;
  vacancyLostRent: number;
  lostRecoverableCharges: number;
  refurbishmentCost: number;
  brokerageFee: number;
  legalFees: number;
  landlordTiContribution: number;
  totalEconomicCost: number;
  paybackYears: number | null;
}

export interface TenantReplacementCostResponse {
  DOWNSIDE: TenantReplacementCostBreakdown[];
  SEVERE: TenantReplacementCostBreakdown[];
}

// ── Data Room Completeness Engine (spec V3.1 §4) ────────────────────────────

export type DataRoomBlockKey =
  | 'CORPORATE_KYC'
  | 'TITLE_LEGAL'
  | 'LEASES'
  | 'TECHNICAL'
  | 'ENVIRONMENTAL_ESG'
  | 'FINANCIAL'
  | 'MARKET'
  | 'VALUATION'
  | 'VEHICLE_PLATFORM';

export type DataRoomItemStatusValue = 'OBTAINED' | 'MISSING' | 'NOT_APPLICABLE' | 'INCONSISTENT';
export const DATA_ROOM_ITEM_STATUS_LABELS: Record<DataRoomItemStatusValue, string> = {
  OBTAINED: 'Obtenu',
  MISSING: 'Manquant',
  NOT_APPLICABLE: 'Non applicable',
  INCONSISTENT: 'Incohérent',
};

export interface DataRoomItemResult {
  block: DataRoomBlockKey;
  itemKey: string;
  label: string;
  status: DataRoomItemStatusValue;
  notes: string | null;
}

export interface DataRoomBlockResult {
  block: DataRoomBlockKey;
  label: string;
  total: number;
  obtainedCount: number;
  missingCount: number;
  notApplicableCount: number;
  inconsistentCount: number;
  completenessPct: number;
  items: DataRoomItemResult[];
}

export interface DataRoomFlaggedItem {
  block: DataRoomBlockKey;
  blockLabel: string;
  itemKey: string;
  label: string;
  notes: string | null;
}

export interface DataRoomCompletenessResult {
  overallCompletenessPct: number;
  blocks: DataRoomBlockResult[];
  missingItems: DataRoomFlaggedItem[];
  inconsistentItems: DataRoomFlaggedItem[];
}

// ── ESG, Energy & Obsolescence Risk Engine (spec V3.1 §12) ──────────────────

export type DpeClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export const DPE_CLASS_VALUES: DpeClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export type EsgEquipmentTier = 'NEUF' | 'BON' | 'VETUSTE' | 'OBSOLETE';
export const ESG_EQUIPMENT_TIER_LABELS: Record<EsgEquipmentTier, string> = {
  NEUF: 'Neuf',
  BON: 'Bon état',
  VETUSTE: 'Vétuste',
  OBSOLETE: 'Obsolète',
};

export type EsgPhysicalRiskTier = 'FAIBLE' | 'MODERE' | 'ELEVE';
export const ESG_PHYSICAL_RISK_TIER_LABELS: Record<EsgPhysicalRiskTier, string> = {
  FAIBLE: 'Faible',
  MODERE: 'Modéré',
  ELEVE: 'Élevé',
};

export interface FractionalEsgAssessment {
  id: string;
  projectId: string;
  dpeClass: DpeClass | null;
  consumptionKwhM2An: number | null;
  decreeTertiaireSubject: boolean;
  equipmentConditionTier: EsgEquipmentTier | null;
  physicalRiskExposure: EsgPhysicalRiskTier | null;
  greenLeaseClauses: boolean;
  notes: string | null;
  updatedById: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface EsgRiskProfileResult {
  dpeClassKnown: boolean;
  capexToComplyPerM2: number | null;
  capexToComplyTotal: number | null;
  capexToCompetePerM2: number | null;
  capexToCompeteTotal: number | null;
  strandedAssetPremiumPct: number;
  equipmentObsolescencePremiumPct: number;
  physicalRiskPremiumPct: number;
  totalValuationImpactPts: number;
}

export interface EsgRiskProfileResponse {
  assessment: FractionalEsgAssessment | null;
  surfaceM2: number | null;
  profile: EsgRiskProfileResult;
}

// ── Asset & Technical Due Diligence Engine (spec V3.1 §6) ───────────────────

export type TechnicalSubBlock = 'BATIMENT' | 'CONFORMITE' | 'ETAT' | 'ADAPTABILITE' | 'OBSOLESCENCE' | 'ENVIRONNEMENT' | 'ASSURANCE';

export type TechnicalTier = 'BON' | 'MOYEN' | 'MAUVAIS' | 'CRITIQUE';
export const TECHNICAL_TIER_LABELS: Record<TechnicalTier, string> = {
  BON: 'Bon',
  MOYEN: 'Moyen',
  MAUVAIS: 'Mauvais',
  CRITIQUE: 'Critique',
};

export interface TechnicalSubBlockResult {
  subBlock: TechnicalSubBlock;
  label: string;
  criteria: string;
  tier: TechnicalTier | null;
  conditionPrealable: boolean;
  notes: string | null;
}

export interface TechnicalRiskRatingResult {
  subBlocks: TechnicalSubBlockResult[];
  worstTier: TechnicalTier | null;
  criticalCount: number;
  conditionPrealableCount: number;
  unassessedCount: number;
}

export type CapexHorizon = 'ANS_0_1' | 'ANS_1_3' | 'ANS_3_5' | 'ANS_5_10' | 'HORS_HORIZON';

export interface CapexHorizonBucket {
  horizon: CapexHorizon;
  label: string;
  proprietaireTotal: number;
  locataireTotal: number;
  total: number;
}

export interface TechnicalAssessmentResponse {
  rating: TechnicalRiskRatingResult;
  capexPlan: CapexHorizonBucket[];
}

// ── Legal, Planning & Tax DD Engine (spec V3.1 §13) ─────────────────────────

export type LegalTaxProfessional = 'AVOCAT' | 'NOTAIRE' | 'FISCALISTE' | 'EXPERT_TECHNIQUE' | 'EXPERT_IMMOBILIER';
export const LEGAL_TAX_PROFESSIONAL_LABELS: Record<LegalTaxProfessional, string> = {
  AVOCAT: 'Avocat',
  NOTAIRE: 'Notaire',
  FISCALISTE: 'Fiscaliste',
  EXPERT_TECHNIQUE: 'Expert technique',
  EXPERT_IMMOBILIER: 'Expert immobilier',
};

export type LegalTaxBlockKey = 'URBANISME' | 'FISCALITE_VEHICULE' | 'CONTENTIEUX';

export type LegalTaxItemStatusValue = 'NON_CONTROLE' | 'CONFORME' | 'RESERVE';
export const LEGAL_TAX_ITEM_STATUS_LABELS: Record<LegalTaxItemStatusValue, string> = {
  NON_CONTROLE: 'Non contrôlé',
  CONFORME: 'Conforme',
  RESERVE: 'Réserve',
};

export interface LegalTaxItemResult {
  block: LegalTaxBlockKey;
  itemKey: string;
  label: string;
  professional: LegalTaxProfessional;
  status: LegalTaxItemStatusValue;
  notes: string | null;
}

export interface LegalTaxBlockResult {
  block: LegalTaxBlockKey;
  label: string;
  total: number;
  nonControleCount: number;
  conformeCount: number;
  reserveCount: number;
  items: LegalTaxItemResult[];
}

export interface LegalTaxValidationNeeded {
  block: LegalTaxBlockKey;
  blockLabel: string;
  itemKey: string;
  label: string;
  professional: LegalTaxProfessional;
  notes: string | null;
}

export interface LegalTaxDdSummary {
  blocks: LegalTaxBlockResult[];
  validationNeeded: LegalTaxValidationNeeded[];
}

// ── Préqualification (spec ATLAS "Moteur de préqualification" v1.0, socle
// P0) — sas d'analyse préparatoire avant qu'un dossier n'entre dans le
// Portefeuille. Voir apps/api/src/prequalification/ pour le détail du
// périmètre P0 livré et des sections différées (P1/P2, ex. étude de marché
// automatisée, exposition groupe).

export type PrequalificationStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'VALIDATED' | 'ARCHIVED';
export const PREQUALIFICATION_STATUS_LABELS: Record<PrequalificationStatus, string> = {
  DRAFT: 'Brouillon',
  NEEDS_REVIEW: 'À revoir',
  VALIDATED: 'Validé',
  ARCHIVED: 'Classé',
};

export type PrequalificationOrientation = 'GO' | 'GO_SOUS_CONDITIONS' | 'WAIT' | 'NO_GO_EN_L_ETAT';
export const PREQUALIFICATION_ORIENTATION_LABELS: Record<PrequalificationOrientation, string> = {
  GO: 'Go',
  GO_SOUS_CONDITIONS: 'Go sous conditions',
  WAIT: 'Wait',
  NO_GO_EN_L_ETAT: "No-go en l'état",
};

export type PrequalificationConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export const PREQUALIFICATION_CONFIDENCE_LABELS: Record<PrequalificationConfidence, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
};

export type PrequalificationProjectType =
  | 'LAND_DIVISION'
  | 'PROPERTY_TRADING_NO_WORKS'
  | 'PROPERTY_TRADING_WITH_WORKS'
  | 'BUILDING_DIVISION'
  | 'RESIDENTIAL_DEVELOPMENT'
  | 'COMMERCIAL_PROPERTY'
  | 'REFINANCING'
  | 'OTHER';
export const PREQUALIFICATION_PROJECT_TYPE_LABELS: Record<PrequalificationProjectType, string> = {
  LAND_DIVISION: 'Division foncière',
  PROPERTY_TRADING_NO_WORKS: 'Marchand de biens sans travaux',
  PROPERTY_TRADING_WITH_WORKS: 'Marchand de biens avec travaux',
  BUILDING_DIVISION: 'Division d\'immeuble',
  RESIDENTIAL_DEVELOPMENT: 'Promotion résidentielle',
  COMMERCIAL_PROPERTY: 'Immobilier commercial',
  REFINANCING: 'Refinancement',
  OTHER: 'Autre',
};

export type EvidenceStatus =
  | 'VERIFIED_OFFICIAL'
  | 'VERIFIED_DOCUMENT'
  | 'DECLARED_BY_OPERATOR'
  | 'CALCULATED_BY_ATLAS'
  | 'ANALYST_ASSESSMENT'
  | 'MISSING'
  | 'CONTRADICTORY';
export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  VERIFIED_OFFICIAL: 'Vérifié (source officielle)',
  VERIFIED_DOCUMENT: 'Vérifié (document)',
  DECLARED_BY_OPERATOR: "Déclaré par l'opérateur",
  CALCULATED_BY_ATLAS: 'Calculé par ATLAS',
  ANALYST_ASSESSMENT: "Appréciation de l'analyste",
  MISSING: 'Manquant',
  CONTRADICTORY: 'Contradictoire',
};

export interface PrequalEvidence {
  id: string;
  prequalificationCaseId: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
  status: EvidenceStatus;
  sourceDocumentId?: string | null;
  /** Auto-déclaré par le modèle lors de l'extraction — jamais une citation API vérifiée. */
  sourcePage?: number | null;
  sourceUrl?: string | null;
  confidence?: number | null;
  note?: string | null;
  verifiedById?: string | null;
  verifiedAt?: string | null;
}

export type PrequalPersonRole = 'PORTEUR_PRINCIPAL' | 'ASSOCIE' | 'DIRIGEANT' | 'GARANT' | 'AUTRE';
export const PREQUAL_PERSON_ROLE_LABELS: Record<PrequalPersonRole, string> = {
  PORTEUR_PRINCIPAL: 'Porteur principal',
  ASSOCIE: 'Associé',
  DIRIGEANT: 'Dirigeant',
  GARANT: 'Garant',
  AUTRE: 'Autre',
};

export interface PrequalTrackRecordEntry {
  date?: string;
  typology?: string;
  amount?: number;
  marginPct?: number;
  outcome?: string;
  actualRole?: string;
}

export interface PrequalPerson {
  id: string;
  prequalificationCaseId: string;
  fullName: string;
  role: PrequalPersonRole;
  cv?: string | null;
  trackRecord: PrequalTrackRecordEntry[];
  declaredNetWorth?: number | null;
  availableEquity?: number | null;
  equityProofNote?: string | null;
  ongoingDealsNote?: string | null;
  incidentsNote?: string | null;
  entityId?: string | null;
}

export type PrequalCompanyState = 'EXISTANTE' | 'A_CREER' | 'RADIEE' | 'INCONNUE';
export const PREQUAL_COMPANY_STATE_LABELS: Record<PrequalCompanyState, string> = {
  EXISTANTE: 'Existante',
  A_CREER: 'À créer',
  RADIEE: 'Radiée',
  INCONNUE: 'Inconnue',
};

export type PrequalCompanyRole = 'OPERATEUR' | 'SOCIETE_PROJET' | 'HOLDING' | 'GARANTE' | 'ENTREPRISE_TRAVAUX' | 'AUTRE';
export const PREQUAL_COMPANY_ROLE_LABELS: Record<PrequalCompanyRole, string> = {
  OPERATEUR: 'Opérateur',
  SOCIETE_PROJET: 'Société de projet',
  HOLDING: 'Holding',
  GARANTE: 'Garante',
  ENTREPRISE_TRAVAUX: 'Entreprise de travaux',
  AUTRE: 'Autre',
};

export interface PrequalExecutive {
  name?: string;
  role?: string;
}

export interface PrequalCompany {
  id: string;
  prequalificationCaseId: string;
  legalName: string;
  siren?: string | null;
  legalForm?: string | null;
  state: PrequalCompanyState;
  role: PrequalCompanyRole;
  executives: PrequalExecutive[];
  accountsAvailable: boolean;
  knownDebtNote?: string | null;
  entityId?: string | null;
}

export type PrequalAcquisitionStatus = 'OFFRE' | 'PROMESSE' | 'ACTE' | 'PROPRIETE';
export const PREQUAL_ACQUISITION_STATUS_LABELS: Record<PrequalAcquisitionStatus, string> = {
  OFFRE: 'Offre',
  PROMESSE: 'Promesse',
  ACTE: 'Acte',
  PROPRIETE: 'Propriété',
};

export interface PrequalCriticalDependency {
  label?: string;
  note?: string;
}

export interface PrequalProjectProfile {
  id: string;
  prequalificationCaseId: string;
  address?: string | null;
  cadastralRef?: string | null;
  city?: string | null;
  postcode?: string | null;
  description?: string | null;
  existingSurfaceSqm?: number | null;
  createdSurfaceSqm?: number | null;
  soldSurfaceSqm?: number | null;
  lotCount?: number | null;
  lotType?: string | null;
  acquisitionStatus?: PrequalAcquisitionStatus | null;
  conditionsPrecedent: string[];
  acquisitionPrice?: number | null;
  worksDescription?: string | null;
  exitStrategy?: string | null;
  interimRevenueNote?: string | null;
  targetTimeline?: string | null;
  criticalDependencies: PrequalCriticalDependency[];
  /** Section "Urbanisme" de la Trame Prequal. */
  urbanismeNote?: string | null;
  /** Section "Commercialisation" de la Trame Prequal. */
  commercialisationNote?: string | null;
}

export interface PrequalCostLineItem {
  id: string;
  prequalFinancialModelId: string;
  category: string;
  label: string;
  amount: number;
  sortOrder: number;
}

export interface PrequalFinancialModel {
  id: string;
  prequalificationCaseId: string;
  amountRequested?: number | null;
  declaredEquity?: number | null;
  provenEquity?: number | null;
  declaredMarginPct?: number | null;
  declaredCoutDeRevient?: number | null;
  declaredChiffreAffaires?: number | null;
  otherRevenueRetained?: number | null;

  // Foncier
  landPrice?: number | null;
  notaryFees?: number | null;

  // Honoraires techniques — 4 champs fixes
  diagnosticsCost?: number | null;
  insuranceCost?: number | null;
  propertyTaxCost?: number | null;
  surveyStudiesCost?: number | null;

  // Autres frais
  agencyFees?: number | null;
  referralFees?: number | null;
  bankMiscFees?: number | null;

  // Financement ATLAS (équivalent "Modalités LPB")
  interestRatePct?: number | null;
  durationMinMonths?: number | null;
  durationTargetMonths?: number | null;
  durationMaxMonths?: number | null;
  feesPctHT?: number | null;
  tvaApplicable: boolean;
  tvaRatePct?: number | null;
  latePenaltyApplied: boolean;
  hypothequeEnvisagee: boolean;
  /** Montant décaissé chez le notaire à l'acte (email de conditions, Trame Prequal). */
  montantDecaisseNotaire?: number | null;
  /** Garanties envisagées, en texte libre. */
  guaranteesNote?: string | null;

  // Financement bancaire optionnel
  bankName?: string | null;
  bankLoanAcquisition?: number | null;
  bankLoanAccompagnement?: number | null;
  bankInterestRatePct?: number | null;
  bankFileFees?: number | null;
  bankGuaranteeFees?: number | null;

  // Covenants ICR/DSCR
  resultatOperationnelEstime?: number | null;
  fluxTresorerieDisponibleEstime?: number | null;

  // Recalculés par prequal-financial.util.ts
  coutDeRevient?: number | null;
  chiffreAffaires?: number | null;
  margeRecalculee?: number | null;
  margeRecalculeePct?: number | null;
  besoinMaxFinancement?: number | null;
  prixSortiePondere?: number | null;
  pointMortAuM2?: number | null;
  ltaPct?: number | null;
  ltcPct?: number | null;
  ltvPct?: number | null;

  baselineLockedAt?: string | null;

  costLineItems: PrequalCostLineItem[];

  /** Décomposition complète recalculée à la volée à la lecture — formes identiques à FinancialSynthesis/FinancialScenario/Covenants du Deal (voir prequalification.service.ts). */
  synthesis?: FinancialSynthesis;
  sensitivity?: FinancialScenario[];
  covenants?: Covenants;
}

export interface PrequalBpComparisonLine {
  key: string;
  label: string;
  initial: number;
  current: number;
  deltaAbs: number;
  deltaPct: number | null;
  initialPct?: number;
  currentPct?: number;
}

export interface PrequalBpComparison {
  hasData: boolean;
  locked: boolean;
  lockedAt: string | null;
  lines: PrequalBpComparisonLine[];
  sensitivity: { initial: FinancialScenario[]; current: FinancialScenario[] } | null;
  marginAlert: { level: 'ATTENTION' | 'URGENT'; message: string } | null;
  disclaimer: string | null;
}

export type PrequalLotStatus = 'NOT_MARKETED' | 'MARKETED' | 'INTEREST' | 'OFFER' | 'RESERVATION' | 'PROMISE' | 'DEED';
export const PREQUAL_LOT_STATUS_LABELS: Record<PrequalLotStatus, string> = {
  NOT_MARKETED: 'Non commercialisé',
  MARKETED: 'Commercialisé',
  INTEREST: 'Intérêt marqué',
  OFFER: 'Offre',
  RESERVATION: 'Réservation',
  PROMISE: 'Promesse',
  DEED: 'Acte',
};

export interface PrequalSalesLot {
  id: string;
  prequalificationCaseId: string;
  label: string;
  assetType?: string | null;
  surfaceSqm?: number | null;
  askingPrice?: number | null;
  expectedPrice?: number | null;
  status: PrequalLotStatus;
  conditionsPrecedent: string[];
  buyerFinancingStatus?: string | null;
  sortOrder: number;
}

export interface PrequalDependency {
  label?: string;
  note?: string;
}

export interface PrequalTimelineAssessment {
  id: string;
  prequalificationCaseId: string;
  businessUrgencyNote?: string | null;
  realisticTimeline?: string | null;
  dependencies: PrequalDependency[];
}

export interface PrequalDocument {
  id: string;
  prequalificationCaseId: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageDriver: string;
  classification?: string | null;
  pageCount?: number | null;
  uploadedById: string;
  uploadedBy?: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null;
  createdAt: string;
}

export type FindingCategory = 'OPERATOR' | 'COMPANY' | 'FINANCIAL' | 'MARKET' | 'PLANNING' | 'COMMERCIALISATION' | 'WORKS' | 'LEGAL' | 'EXPOSURE';
export const FINDING_CATEGORY_LABELS: Record<FindingCategory, string> = {
  OPERATOR: 'Opérateur',
  COMPANY: 'Société',
  FINANCIAL: 'Financier',
  MARKET: 'Marché',
  PLANNING: 'Calendrier',
  COMMERCIALISATION: 'Commercialisation',
  WORKS: 'Travaux',
  LEGAL: 'Juridique',
  EXPOSURE: 'Exposition',
};

export type FindingSeverity = 'INFO' | 'POSITIVE' | 'WATCH' | 'MATERIAL' | 'BLOCKING';
export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = {
  INFO: 'Info',
  POSITIVE: 'Point positif',
  WATCH: 'À surveiller',
  MATERIAL: 'Matériel',
  BLOCKING: 'Bloquant',
};

export type FindingGeneratedBy = 'RULE' | 'MODEL' | 'ANALYST';
export type FindingReviewStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'AMENDED';
export const FINDING_REVIEW_STATUS_LABELS: Record<FindingReviewStatus, string> = {
  PENDING: 'À statuer',
  ACCEPTED: 'Accepté',
  REJECTED: 'Rejeté',
  AMENDED: 'Amendé',
};

export interface Finding {
  id: string;
  prequalificationCaseId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  statement: string;
  rationale: string;
  evidenceIds: string[];
  ruleId?: string | null;
  generatedBy: FindingGeneratedBy;
  reviewStatus: FindingReviewStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface PrequalDecisiveQuestion {
  id: string;
  prequalificationCaseId: string;
  question: string;
  reason: string;
  affectedFindingIds: string[];
  answerCouldChangeOrientation: boolean;
  priority: 'blocking' | 'decisive' | 'instruction' | 'comfort';
  answer?: string | null;
  answeredAt?: string | null;
  createdAt: string;
}

export type PrequalDocumentRequestStatus = 'requested' | 'received' | 'expired' | 'contradictory' | 'not_usable';
export const PREQUAL_DOCUMENT_REQUEST_STATUS_LABELS: Record<PrequalDocumentRequestStatus, string> = {
  requested: 'Demandée',
  received: 'Reçue',
  expired: 'Périmée',
  contradictory: 'Contradictoire',
  not_usable: 'Non exploitable',
};

export interface PrequalDocumentRequest {
  id: string;
  prequalificationCaseId: string;
  label: string;
  block: string;
  status: PrequalDocumentRequestStatus;
  linkedDocumentId?: string | null;
}

/** Data room dynamique (spec §14) — les 8 blocs conditionnels, jamais suggérés tous ensemble (voir prequal-data-room.util.ts). */
export type DataRoomBlock =
  | 'identite'
  | 'travaux'
  | 'urbanisme'
  | 'division'
  | 'parcellaire'
  | 'commercialisation'
  | 'acquisition_conditionnelle'
  | 'revenus_locatifs'
  | 'autres_plateformes';

export const DATA_ROOM_BLOCK_LABELS: Record<DataRoomBlock, string> = {
  identite: 'Identité & solvabilité',
  travaux: 'Travaux',
  urbanisme: 'Urbanisme',
  division: 'Division',
  parcellaire: 'Parcellaire',
  commercialisation: 'Commercialisation',
  acquisition_conditionnelle: 'Acquisition conditionnelle',
  revenus_locatifs: 'Revenus locatifs',
  autres_plateformes: 'Autres plateformes',
};

export interface PrequalDataRoomSuggestion {
  block: DataRoomBlock;
  reason: string;
  documents: string[];
}

export interface PrequalificationCase {
  id: string;
  organizationId: string;
  name: string;
  status: PrequalificationStatus;
  orientation?: PrequalificationOrientation | null;
  confidence?: PrequalificationConfidence | null;
  projectType?: PrequalificationProjectType | null;
  version: number;
  entryChannel?: string | null;
  introducer?: string | null;
  /** Ressenti qualitatif du chargé d'affaires sur le projet (Trame Prequal §6). */
  analystImpressionNote?: string | null;
  assignedAnalystId: string;
  assignedAnalyst?: { id: string; firstName: string; lastName: string } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string | null;
  promotedDealId?: string | null;
  /** Numéro de la PrequalificationVersion figée au moment de la promotion (spec §17) — permet de retrouver la décision d'origine exacte pour la comparer à la réalité du Deal (P2, suivi post-promotion). */
  promotedVersionNumber?: number | null;
  _count?: { findings: number; documents: number };
  /** Uniquement dans la liste (PrequalificationService.list) — findings BLOCKING non résolus (PENDING/ACCEPTED). */
  blockingFindingsCount?: number;
  /** Idem, projet lié — absent tant qu'aucune fiche projet n'a été renseignée. */
  project?: { city?: string | null } | null;
}

export interface PrequalificationCaseDetail extends PrequalificationCase {
  people: PrequalPerson[];
  companies: PrequalCompany[];
  project: PrequalProjectProfile | null;
  financial: PrequalFinancialModel | null;
  planning: PrequalTimelineAssessment | null;
  lots: PrequalSalesLot[];
  documents: PrequalDocument[];
  evidence: PrequalEvidence[];
  findings: Finding[];
  questions: PrequalDecisiveQuestion[];
  requests: PrequalDocumentRequest[];
}

export interface PrequalPromotionResult {
  prequalificationId: string;
  portfolioProjectId: string | null;
  stage: 'SOURCING' | null;
  alreadyPromoted: boolean;
}

export interface PrequalExtractionResult {
  project: {
    address: string | null;
    city: string | null;
    postcode: string | null;
    existingSurfaceSqm: number | null;
    createdSurfaceSqm: number | null;
    lotCount: number | null;
    acquisitionPrice: number | null;
    worksDescription: string | null;
    sourcePage: number | null;
  } | null;
  financial: {
    amountRequested: number | null;
    declaredEquity: number | null;
    declaredMarginPct: number | null;
    declaredCoutDeRevient: number | null;
    declaredChiffreAffaires: number | null;
    sourcePage: number | null;
  } | null;
  costLineItems: { category: string; label: string; amount: number; sourcePage: number | null }[];
  lots: { label: string; surfaceSqm: number | null; askingPrice: number | null; expectedPrice: number | null; sourcePage: number | null }[];
  people: { fullName: string; role: string | null; sourcePage: number | null }[];
  companies: { legalName: string; siren: string | null; sourcePage: number | null }[];
  notes: string;
  sourceDocumentId: string;
  sourceDocumentName: string;
}

// ── Préqualification P1 (spec ATLAS v1.0, §21 "Gain analytique") ──

export interface PrequalExposureDeal {
  dealId: string;
  dealName: string;
  dealReference: string;
  matchedOn: string;
  stage: string;
  status: string;
  amountRaised: number;
  interestRate: number | null;
  outstandingCapital: number;
  expectedInterest: number | null;
  dateMax: string | null;
  recoveryStatus: string;
  isLate: boolean;
}

export interface PrequalExternalFinancing {
  entityName: string;
  platformName: string;
  projectName: string;
  amountTarget: number | null;
  status: string;
}

export interface PrequalExposureSummary {
  deals: PrequalExposureDeal[];
  totalOutstandingCapital: number;
  totalExpectedInterest: number;
  lateCount: number;
  amountRequested: number | null;
  newExposureAfterFinancing: number | null;
  concentrationPct: number | null;
  externalFinancings: PrequalExternalFinancing[];
}

export interface PrequalVersionSummary {
  id: string;
  versionNumber: number;
  orientation: PrequalificationOrientation;
  decisionComment: string;
  validatedAt: string;
  validatedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface PrequalFieldDelta {
  field: string;
  before: number | string | null;
  after: number | string | null;
}

export type FindingSeverityKey = 'INFO' | 'POSITIVE' | 'WATCH' | 'MATERIAL' | 'BLOCKING';

export interface PrequalVersionDiff {
  versionA: number;
  versionB: number;
  orientationA: string | null;
  orientationB: string | null;
  orientationChanged: boolean;
  financialChanges: PrequalFieldDelta[];
  findingsCountA: Record<FindingSeverityKey, number>;
  findingsCountB: Record<FindingSeverityKey, number>;
  peopleCountA: number;
  peopleCountB: number;
  companiesCountA: number;
  companiesCountB: number;
  lotsCountA: number;
  lotsCountB: number;
  documentsCountA: number;
  documentsCountB: number;
}

// ── Étude de marché automatisée (spec §10) ──

export interface MarketStudyFilters {
  source: string;
  dateExtraction: string;
  commune: string | null;
  natureBien: string;
  sampleSize: number;
}

export interface MarketPopulationStats {
  median: number | null;
  average: number | null;
  q1: number | null;
  q3: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface MarketPositioning {
  prixSortiePondereParM2: number | null;
  ecartMedianePct: number | null;
  percentileRank: number | null;
  ventesAuDessusDuProjetCount: number | null;
  ticketMaxObserve: number | null;
  ecartPointMortPct: number | null;
  margeSiVenteMediane: number | null;
  margeSiVenteMedianePct: number | null;
  prixMinimalPourMargeCibleParM2: number | null;
}

export interface MarketLiquidity {
  ventesComparablesSurPeriode: number;
  ventesParMois: number | null;
  delaiMoyenEntreDeuxVentesJours: number | null;
  nombreDeLotsDuProjet: number;
  dureeTheoriqueEcoulementMois: number | null;
  echantillonTropFaible: boolean;
}

export interface PrequalMarketStudy {
  filters: MarketStudyFilters;
  population: MarketPopulationStats;
  positioning: MarketPositioning;
  liquidity: MarketLiquidity;
}

// ── Stress tests (spec §11) ──

export type PrequalStressCapacity = 'OK' | 'TENDUE' | 'INSUFFISANTE' | 'NON_QUANTIFIABLE';

export const PREQUAL_STRESS_CAPACITY_LABELS: Record<PrequalStressCapacity, string> = {
  OK: 'OK',
  TENDUE: 'Tendue',
  INSUFFISANTE: 'Insuffisante',
  NON_QUANTIFIABLE: 'Non quantifiable',
};

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
