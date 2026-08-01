import { PageHeader } from "@/components/ui/PageHeader";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAllDealNotes, getAlerts, getDeals, getDecisions, getTasks } from "@/lib/data";
import { searchKnowledge, TYPE_LABELS } from "@/lib/knowledge-search";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q ?? "";
  const [notes, decisions, alerts, tasks, deals] = await Promise.all([
    getAllDealNotes(),
    getDecisions(),
    getAlerts(),
    getTasks(),
    getDeals(),
  ]);

  const results = searchKnowledge(query, { notes, decisions, alerts, tasks, deals });

  return (
    <div>
      <PageHeader
        eyebrow="Module 9"
        title="Knowledge"
        subtitle="Mémoire permanente d'Estrella Capital — notes, décisions de comité, alertes, tâches et dossiers, en un seul endroit."
      />

      <form method="GET" className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Rechercher dans les notes, décisions, alertes, tâches, dossiers…"
          className="w-full rounded border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-faint focus:border-accent/50 focus:outline-none"
        />
      </form>

      {!query.trim() ? (
        <p className="text-sm text-muted">
          Lancez une recherche pour parcourir la mémoire de la société de gestion.
        </p>
      ) : (
        <Card>
          <SectionLabel>
            {results.length} résultat{results.length > 1 ? "s" : ""} pour « {query} »
          </SectionLabel>
          <div className="mt-4 flex flex-col gap-3">
            {results.map((r, i) => (
              <a
                key={i}
                href={r.href}
                className="block rounded border border-line px-4 py-3 transition-colors hover:border-accent/40"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{TYPE_LABELS[r.type]}</Badge>
                  <span className="text-sm text-ink">{r.title}</span>
                  <span className="ml-auto text-xs text-faint">{formatDate(r.date)}</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted">{r.snippet}</p>
              </a>
            ))}
            {results.length === 0 && (
              <p className="text-sm text-muted">Aucun résultat pour cette recherche.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
