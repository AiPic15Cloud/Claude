import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, riskScoreTone } from "@/components/ui/Badge";
import { getDeals, getOperators } from "@/lib/data";
import { formatEurCompact } from "@/lib/format";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [deals, operators] = await Promise.all([getDeals(), getOperators()]);
  const operatorById = new Map(operators.map((o) => [o.id, o]));

  return (
    <div>
      <PageHeader
        eyebrow="Module 2"
        title="Pipeline"
        subtitle="Sourcing → Analyse → Comité → Conditions → Collecte → Financé → Suivi → Remboursé → Défaut. Chaque dossier conserve son historique complet à chaque étape."
      />

      <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-4">
        {DEAL_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          return (
            <div key={stage} className="w-[85vw] max-w-72 shrink-0 sm:w-72">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-micro font-medium uppercase tracking-wider text-faint">
                  {DEAL_STAGE_LABELS[stage]}
                </p>
                <span className="tabular text-micro text-faint">{stageDeals.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {stageDeals.map((deal) => {
                  const operator = operatorById.get(deal.operator_id);
                  return (
                    <Link
                      key={deal.id}
                      href={`/pipeline/${deal.id}`}
                      className="block rounded border border-line bg-surface p-3.5 transition-colors hover:border-accent/40"
                    >
                      <p className="mb-1.5 text-sm leading-snug text-ink">{deal.name}</p>
                      <p className="mb-2.5 text-xs text-muted">{operator?.name ?? deal.operator_id}</p>
                      <div className="flex items-center justify-between">
                        <span className="tabular text-xs text-muted">
                          {formatEurCompact(deal.montant)}
                        </span>
                        <Badge tone={riskScoreTone(deal.risque)}>{deal.risque}/10</Badge>
                      </div>
                    </Link>
                  );
                })}
                {stageDeals.length === 0 && (
                  <p className="rounded border border-dashed border-line px-3 py-4 text-center text-xs text-faint">
                    Aucun dossier
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
