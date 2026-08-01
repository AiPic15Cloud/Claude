import type { Alert, AtlasTask, Deal, DealNote, Decision } from "@/lib/types";

// Recherche intelligente à travers la mémoire de la société de gestion — notes,
// décisions de comité, alertes, tâches et dossiers. Recherche plein texte simple
// (sous-chaîne, insensible à la casse) sur les jeux de données déjà chargés ; une
// vraie mise à l'échelle (mails, newsletters, jurisprudences) viendrait avec une
// recherche vectorielle côté Supabase (pgvector) une fois ces sources connectées.

export type KnowledgeResultType = "note" | "decision" | "alerte" | "tache" | "dossier";

export interface KnowledgeResult {
  type: KnowledgeResultType;
  title: string;
  snippet: string;
  date: string;
  href: string;
}

const TYPE_LABELS: Record<KnowledgeResultType, string> = {
  note: "Note",
  decision: "Décision de comité",
  alerte: "Alerte",
  tache: "Tâche",
  dossier: "Dossier",
};

export { TYPE_LABELS };

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export function searchKnowledge(
  query: string,
  data: {
    notes: DealNote[];
    decisions: Decision[];
    alerts: Alert[];
    tasks: AtlasTask[];
    deals: Deal[];
  },
): KnowledgeResult[] {
  if (!query.trim()) return [];
  const dealById = new Map(data.deals.map((d) => [d.id, d]));
  const results: KnowledgeResult[] = [];

  for (const n of data.notes) {
    if (matches(query, n.content, n.author)) {
      const deal = dealById.get(n.deal_id);
      results.push({
        type: "note",
        title: `Note de ${n.author}${deal ? ` — ${deal.name}` : ""}`,
        snippet: n.content,
        date: n.created_at,
        href: `/pipeline/${n.deal_id}`,
      });
    }
  }

  for (const d of data.decisions) {
    if (matches(query, d.rationale, d.decided_by, d.vote_result, ...d.risques_identifies)) {
      const deal = dealById.get(d.deal_id);
      results.push({
        type: "decision",
        title: `Comité du ${d.committee_date}${deal ? ` — ${deal.name}` : ""}`,
        snippet: d.rationale,
        date: d.committee_date,
        href: `/pipeline/${d.deal_id}`,
      });
    }
  }

  for (const a of data.alerts) {
    if (matches(query, a.message, a.type)) {
      results.push({
        type: "alerte",
        title: a.type,
        snippet: a.message,
        date: a.created_at,
        href: a.related_deal_id ? `/pipeline/${a.related_deal_id}` : "/taches",
      });
    }
  }

  for (const t of data.tasks) {
    if (matches(query, t.title, t.description)) {
      results.push({
        type: "tache",
        title: t.title,
        snippet: t.description ?? "",
        date: t.created_at,
        href: t.related_deal_id ? `/pipeline/${t.related_deal_id}` : "/taches",
      });
    }
  }

  for (const d of data.deals) {
    if (matches(query, d.name, d.statut_detail, d.ville, d.region)) {
      results.push({
        type: "dossier",
        title: d.name,
        snippet: d.statut_detail,
        date: d.updated_at,
        href: `/pipeline/${d.id}`,
      });
    }
  }

  return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
