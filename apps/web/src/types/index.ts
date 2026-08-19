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

export type DealRecoveryStatus = 'SAIN' | 'EN_RETARD' | 'PRE_CONTENTIEUX' | 'PROCEDURE';

export const DEAL_RECOVERY_STATUS_LABELS: Record<DealRecoveryStatus, string> = {
  SAIN: 'Sain',
  EN_RETARD: 'En retard',
  PRE_CONTENTIEUX: 'Pré-contentieux',
  PROCEDURE: 'Procédure',
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
  atlasScore?: number | null;
  riskScore?: number | null;
  riskScorePrevious?: number | null;
  riskScoreUpdatedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  dateMin?: string | null;
  dateCible?: string | null;
  dateMax?: string | null;
  repaid: boolean;
  recoveryStatus: DealRecoveryStatus;
  porteurNom?: string | null;
  porteurSociete?: string | null;
  porteurAdresse?: string | null;
  porteurSiren?: string | null;
  porteurMonitoringStatus?: string | null;
  deadlineAlert?: DeadlineAlert;
  checkpointHealth?: CheckpointHealth;
  narrative?: AutoSummary;
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

export interface DealKpis {
  activeDeals: number;
  totalAum: number;
  totalRaised: number;
  fundingProgress: number;
  averageInterestRate: number;
  lateDeals: number;
  byStage: Record<string, number>;
  byType: Record<string, number>;
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
  cumulativeAum: number;
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
  // Calculés côté serveur à partir de endDate — jamais saisis directement.
  validity: GuaranteeValidity;
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
  constructionCostPerSqm: number;
  sellingPricePerSqm: number;
  otherCosts: number;
  targetMarginPct: number | null;
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

export interface FinancialModel {
  assumption: FinancialAssumption | null;
  valuation: FinancialScenario | null;
  sensitivity: FinancialScenario[] | null;
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
  prixVenteReelADate: number | null;
  atterrissagePrevu: string | null;
  notes: string | null;
  deltaTravaux: number | null;
  deltaPrix: number | null;
  margeADate: number | null;
  createdAt: string;
}

// ── Score ATLAS ──────────────────────────────────────────────

export interface ScoreFactor {
  key: string;
  label: string;
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface ScoreBreakdown {
  score: number;
  factors: ScoreFactor[];
  computedAt: string;
  disclaimer: string;
}

// ── Risk Engine ──────────────────────────────────────────────

export interface RiskFactor {
  key: string;
  label: string;
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface RiskBreakdown {
  dealId: string;
  score: number | null;
  previousScore: number | null;
  tier: 'SAFE' | 'WATCH' | 'HIGH' | null;
  trend: 'UP' | 'DOWN' | 'FLAT' | null;
  factors: RiskFactor[];
  computedAt: string;
  suppressed: boolean;
  disclaimer: string;
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
}
