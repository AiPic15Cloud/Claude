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
  byStage: Record<string, number>;
  byType: Record<string, number>;
}

export interface PipelineStage {
  stage: DealStage;
  count: number;
  totalAmount: number;
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
