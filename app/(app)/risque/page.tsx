import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAlerts, getDeals, getOperators } from "@/lib/data";
import { assessPortfolioRisk, type RiskLevel } from "@/lib/risk-engine";
import { formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const LEVEL_TONE: Record<RiskLevel, "low" | "medium" | "high"> = {
  faible: "low",
  moderee: "medium",
  elevee: "high",
};

export default async function RiskOfficePage() {
  const [deals, operators, alerts] = await Promise.all([getDeals(), getOperators(), getAlerts()]);
  const { indiceGlobal, assessments } = assessPortfolioRisk(deals, operators, alerts);
  const dealById = new Map(deals.map((d) => [d.id, d]));

  return (
    <div>
      <PageHeader
        eyebrow="Module 5"
        title="Risk Office"
        subtitle="Indice de risque global et évaluation opération par opération, recalculés à chaque chargement — score, causes, probabilité, impact, actions recommandées."
      />

      <div className="mb-6 grid grid-cols-1 gap-6 rounded border border-line bg-surface p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-faint">
            Indice de risque global
          </p>
          <p className="tabular text-3xl font-light text-ink">{indiceGlobal}</p>
          <p className="text-xs text-faint">/ 100 — pondéré par l'encours</p>
        </div>
        <div>
          <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-faint">
            Opérations sous risque élevé
          </p>
          <p className="tabular text-3xl font-light text-ink">
            {assessments.filter((a) => a.probabilite === "elevee").length}
          </p>
          <p className="text-xs text-faint">sur {assessments.length} opérations en portefeuille</p>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-faint">Méthode</p>
          <p className="text-xs leading-relaxed text-muted">
            Score = 55% score de risque interne du dossier + 30% défiance envers l'opérateur (indice de
            confiance) + 15% alertes ouvertes liées. Pour la synthèse narrative et les recommandations
            générées par IA, voir le module <Link href="/portfolio" className="text-accent hover:underline">Portfolio</Link>.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {assessments.map((assessment) => {
          const deal = dealById.get(assessment.dealId);
          if (!deal) return null;
          return (
            <Card key={assessment.dealId}>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <Link
                    href={`/pipeline/${deal.id}`}
                    className="text-sm font-medium text-ink hover:text-accent"
                  >
                    {deal.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">{formatEur(deal.montant)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={LEVEL_TONE[assessment.probabilite]}>
                    Probabilité {assessment.probabilite}
                  </Badge>
                  <Badge tone={LEVEL_TONE[assessment.impact]}>Impact {assessment.impact}</Badge>
                  <span className="tabular text-sm text-ink">{assessment.score}/10</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <SectionLabel>Causes</SectionLabel>
                  <ul className="mt-2 flex flex-col gap-1">
                    {assessment.causes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted">
                        <span className="text-faint">—</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <SectionLabel>Actions recommandées</SectionLabel>
                  <ul className="mt-2 flex flex-col gap-1">
                    {assessment.actionsRecommandees.map((a, i) => (
                      <li key={i} className="flex gap-2 text-xs text-ink">
                        <span className="text-faint">—</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
