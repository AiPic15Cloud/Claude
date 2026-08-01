import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Alert,
  AtlasTask,
  Decision,
  Deal,
  DealDocument,
  DealNote,
  Operator,
} from "@/lib/types";
import * as seed from "@/lib/data/seed";

// Couche d'accès aux données. Si Supabase est configuré (NEXT_PUBLIC_SUPABASE_URL +
// clé), chaque fonction interroge la table correspondante. Sinon, elle retombe sur
// le jeu de données de démonstration — même forme de données dans les deux cas,
// donc aucune page ne dépend de la source réelle.

async function fromTableOrSeed<T>(table: string, seedData: T[]): Promise<T[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return seedData;
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.error(`Supabase error reading ${table}:`, error.message);
    return seedData;
  }
  return (data as T[]) ?? [];
}

export async function getDeals(): Promise<Deal[]> {
  return fromTableOrSeed<Deal>("deals", seed.deals);
}

export async function getDealById(id: string): Promise<Deal | null> {
  const all = await getDeals();
  return all.find((d) => d.id === id) ?? null;
}

export async function getOperators(): Promise<Operator[]> {
  return fromTableOrSeed<Operator>("operators", seed.operators);
}

export async function getOperatorById(id: string): Promise<Operator | null> {
  const all = await getOperators();
  return all.find((o) => o.id === id) ?? null;
}

export async function getDealNotes(dealId: string): Promise<DealNote[]> {
  const all = await fromTableOrSeed<DealNote>("deal_notes", seed.dealNotes);
  return all.filter((n) => n.deal_id === dealId);
}

export async function getDealDocuments(dealId: string): Promise<DealDocument[]> {
  const all = await fromTableOrSeed<DealDocument>("deal_documents", seed.dealDocuments);
  return all.filter((d) => d.deal_id === dealId);
}

export async function getDecisions(): Promise<Decision[]> {
  return fromTableOrSeed<Decision>("decisions", seed.decisions);
}

export async function getDecisionsForDeal(dealId: string): Promise<Decision[]> {
  const all = await getDecisions();
  return all.filter((d) => d.deal_id === dealId);
}

export async function getTasks(): Promise<AtlasTask[]> {
  return fromTableOrSeed<AtlasTask>("tasks", seed.tasks);
}

export async function getAlerts(): Promise<Alert[]> {
  return fromTableOrSeed<Alert>("alerts", seed.alerts);
}

export async function getOpenAlerts(): Promise<Alert[]> {
  const all = await getAlerts();
  return all.filter((a) => !a.resolved);
}
