export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export type DealType = 'CROWDFUNDING' | 'FRACTIONNE' | 'PROMOTION' | 'MARCHAND_DE_BIENS' | 'AUTRE';

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
  CROWDFUNDING: 'Crowdfunding',
  FRACTIONNE: 'Fractionné',
  PROMOTION: 'Promotion',
  MARCHAND_DE_BIENS: 'Marchand de biens',
  AUTRE: 'Autre',
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
  startDate?: string | null;
  endDate?: string | null;
  dateMin?: string | null;
  dateCible?: string | null;
  dateMax?: string | null;
  deadlineAlert?: DeadlineAlert;
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

export interface Note {
  id: string;
  dealId: string;
  authorId: string;
  author?: UserSummary;
  content: string;
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
  createdAt: string;
}

export interface Alert {
  id: string;
  organizationId: string;
  dealId?: string | null;
  deal?: { id: string; name: string; reference: string } | null;
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
  deadlineAlerts: DealDeadlineAlert[];
  autoSummary: string;
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

// ── Dossiers: guarantees & financial model ──────────────────

export type GuaranteeType = 'HYPOTHEQUE' | 'CAUTION' | 'GAGE' | 'NANTISSEMENT' | 'PRIVILEGE' | 'AUTRE';
export type GuaranteeStatus = 'ACTIVE' | 'RELEASED' | 'DEFAULTED';

export const GUARANTEE_TYPE_LABELS: Record<GuaranteeType, string> = {
  HYPOTHEQUE: 'Hypothèque',
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

export interface Guarantee {
  id: string;
  dealId: string;
  type: GuaranteeType;
  description: string;
  amount: string;
  rank: number;
  status: GuaranteeStatus;
  createdAt: string;
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

export interface ChatResponse {
  agent: string;
  message: string;
  usage?: unknown;
}
