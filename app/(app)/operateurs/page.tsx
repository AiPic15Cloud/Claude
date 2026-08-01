import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { getDeals, getOperators } from "@/lib/data";
import { formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

function confidenceTone(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "low";
  if (score >= 50) return "medium";
  return "high";
}

export default async function OperatorIntelligencePage() {
  const [operators, deals] = await Promise.all([getOperators(), getDeals()]);
  const sorted = [...operators].sort((a, b) => b.indice_confiance - a.indice_confiance);

  return (
    <div>
      <PageHeader
        eyebrow="Module 11"
        title="Operator Intelligence"
        subtitle="Historique, notation, TRI moyen, délais, défauts, retards, qualité de reporting et indice de confiance — pour chaque opérateur partenaire."
      />

      <div className="grid grid-cols-2 gap-6">
        {sorted.map((op) => {
          const opDeals = deals.filter((d) => d.operator_id === op.id);
          return (
            <Card key={op.id}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-ink">{op.name}</h3>
                  <p className="mt-0.5 text-xs text-muted">{opDeals.length} dossier(s) au total</p>
                </div>
                <Badge tone={confidenceTone(op.indice_confiance)}>
                  Confiance {op.indice_confiance}/100
                </Badge>
              </div>

              <div className="mb-4 grid grid-cols-4 gap-3">
                <StatTile label="TRI moyen" value={formatPercent(op.tri_moyen)} />
                <StatTile label="Délai moyen" value={`${op.delai_moyen_jours} j`} />
                <StatTile label="Défauts" value={op.defauts_count} />
                <StatTile label="Retards" value={op.retards_count} />
              </div>

              {op.derniere_actualite && (
                <p className="mb-2 text-xs text-muted">
                  <span className="text-faint">Actualité — </span>
                  {op.derniere_actualite}
                </p>
              )}
              {op.notes && <p className="text-xs leading-relaxed text-faint">{op.notes}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
