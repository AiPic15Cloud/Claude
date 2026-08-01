import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StageBadge } from "@/components/ui/StageBadge";
import { formatEur, formatDate, daysUntil } from "@/lib/format";
import { getDeals, getOperators } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ComitePage() {
  const [deals, operators] = await Promise.all([getDeals(), getOperators()]);
  const operatorById = new Map(operators.map((o) => [o.id, o]));
  const comiteDeals = deals.filter((d) => d.stage === "comite");

  return (
    <div>
      <PageHeader
        eyebrow="Module 3"
        title="Investment Committee"
        subtitle="Chaque dossier en comité dispose automatiquement d'un résumé exécutif, d'une analyse IA, d'un scoring, des risques et d'un vote recommandé — voir l'onglet Atlas Analyst sur la fiche du dossier."
      />

      <Card>
        <CardHeader title="Dossiers en attente de vote" subtitle={`${comiteDeals.length} dossier(s)`} />
        {comiteDeals.length === 0 ? (
          <p className="text-sm text-muted">Aucun dossier en comité actuellement.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {comiteDeals.map((deal) => {
              const operator = operatorById.get(deal.operator_id);
              const jours = deal.vote_expires_at ? daysUntil(deal.vote_expires_at) : null;
              return (
                <Link
                  key={deal.id}
                  href={`/pipeline/${deal.id}`}
                  className="flex items-center justify-between rounded border border-line px-4 py-3 transition-colors hover:border-accent/40"
                >
                  <div>
                    <p className="text-sm text-ink">{deal.name}</p>
                    <p className="text-xs text-muted">{operator?.name ?? deal.operator_id} · {formatEur(deal.montant)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {jours !== null && (
                      <span className="text-xs text-faint">
                        Vote le {deal.vote_expires_at ? formatDate(deal.vote_expires_at) : "—"} ({jours} j)
                      </span>
                    )}
                    <StageBadge stage={deal.stage} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
