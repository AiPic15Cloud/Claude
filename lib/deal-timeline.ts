import type { Deal, DealDocument, DealNote, Decision } from "@/lib/types";

export interface TimelineEntry {
  date: string;
  kind: "sourcing" | "document" | "note" | "decision";
  label: string;
  description?: string;
}

export function buildDealTimeline(
  deal: Deal,
  notes: DealNote[],
  documents: DealDocument[],
  decisions: Decision[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  entries.push({
    date: deal.sourced_at,
    kind: "sourcing",
    label: "Dossier sourcé",
    description: deal.origine,
  });

  for (const doc of documents) {
    entries.push({
      date: doc.uploaded_at,
      kind: "document",
      label: `Document déposé — ${doc.name}`,
      description: doc.type,
    });
  }

  for (const note of notes) {
    entries.push({
      date: note.created_at,
      kind: "note",
      label: `Note — ${note.author}`,
      description: note.content,
    });
  }

  for (const decision of decisions) {
    entries.push({
      date: decision.committee_date,
      kind: "decision",
      label: `Comité — ${decision.decision}`,
      description: decision.rationale,
    });
  }

  return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
