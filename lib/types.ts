// Types partagés — reflètent le schéma défini dans supabase/migrations/0001_init.sql.
// Un "deal" est l'entité unique qui traverse tout le cycle de vie : Pipeline (sourcing
// → comité → collecte) puis Portfolio (financé → suivi → remboursé/défaut).

export type DealStage =
  | "sourcing"
  | "analyse"
  | "comite"
  | "conditions"
  | "collecte"
  | "finance"
  | "suivi"
  | "rembourse"
  | "defaut";

export const DEAL_STAGES: DealStage[] = [
  "sourcing",
  "analyse",
  "comite",
  "conditions",
  "collecte",
  "finance",
  "suivi",
  "rembourse",
  "defaut",
];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  sourcing: "Sourcing",
  analyse: "Analyse",
  comite: "Comité",
  conditions: "Conditions",
  collecte: "Collecte",
  finance: "Financé",
  suivi: "Suivi",
  rembourse: "Remboursé",
  defaut: "Défaut",
};

// Un deal est "en portefeuille" une fois financé.
export const PORTFOLIO_STAGES: DealStage[] = ["finance", "suivi", "rembourse", "defaut"];
export const PIPELINE_STAGES: DealStage[] = [
  "sourcing",
  "analyse",
  "comite",
  "conditions",
  "collecte",
];

export type DealType =
  | "promotion"
  | "marchand_de_biens"
  | "dette_privee"
  | "value_add"
  | "core_plus";

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  promotion: "Promotion immobilière",
  marchand_de_biens: "Marchand de biens",
  dette_privee: "Dette privée",
  value_add: "Value-add",
  core_plus: "Core+",
};

export interface Operator {
  id: string;
  name: string;
  tri_moyen: number; // TRI moyen historique, en %
  delai_moyen_jours: number; // écart moyen vs échéancier prévisionnel
  defauts_count: number;
  retards_count: number;
  operations_count: number;
  qualite_reporting: number; // 1-10
  indice_confiance: number; // 0-100, calculé
  derniere_actualite: string | null;
  notes: string | null;
}

export interface Deal {
  id: string;
  name: string;
  operator_id: string;
  stage: DealStage;
  type: DealType;
  region: string;
  ville: string;
  montant: number; // EUR engagés
  rendement_cible: number; // % annuel cible
  duree_mois: number;
  risque: number; // score 1-10 (10 = risque max)
  banque: string | null;
  origine: string; // ex: "Apport direct", "Réseau CGP", "Plateforme X"
  commercialisateur: string | null;
  statut_detail: string; // libellé libre : "Travaux en cours", "Commercialisation 62%"...
  sourced_at: string; // ISO date
  echeance_prevue: string; // ISO date
  vote_expires_at: string | null; // ISO date — pour les dossiers en comité
  created_at: string;
  updated_at: string;
}

export interface DealNote {
  id: string;
  deal_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface DealDocument {
  id: string;
  deal_id: string;
  name: string;
  type: string; // "Business Plan", "Compromis", "Plan", "Photo", "Permis"...
  uploaded_at: string;
}

export interface Decision {
  id: string;
  deal_id: string;
  committee_date: string;
  decision: "approuve" | "refuse" | "conditionnel" | "en_attente";
  rationale: string;
  risques_identifies: string[];
  decided_by: string;
  vote_result: string; // ex: "4 pour / 1 abstention"
}

export type TaskPriority = "haute" | "moyenne" | "basse";
export type TaskStatus = "a_faire" | "en_cours" | "fait";

export interface AtlasTask {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  related_deal_id: string | null;
  source: "alerte" | "manuel";
  created_at: string;
}

export type AlertSeverity = "critique" | "elevee" | "moderee";

export interface Alert {
  id: string;
  type: string; // "Retard travaux", "Échéance vote", "Dérive budgétaire"...
  severity: AlertSeverity;
  message: string;
  related_deal_id: string | null;
  created_at: string;
  resolved: boolean;
}

export interface PortfolioSnapshot {
  deals: Deal[];
  operators: Operator[];
  totalEngage: number;
  countByStage: Record<DealStage, number>;
  montantByRegion: Record<string, number>;
  montantByOperator: Record<string, number>;
  montantByType: Record<string, number>;
  montantByBanque: Record<string, number>;
  montantByOrigine: Record<string, number>;
  rendementMoyenPondere: number;
  risqueMoyenPondere: number;
  concentrationTop3Operateur: number; // % du portefeuille sur les 3 premiers opérateurs
  concentrationTop3Region: number;
}
