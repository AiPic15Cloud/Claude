import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { PriorityCard } from "@/components/ui/PriorityCard";
import { AtlasUnavailable } from "@/components/ui/AtlasUnavailable";
import { StatTile } from "@/components/ui/StatTile";
import { getAlerts, getDeals, getOperators, getTasks } from "@/lib/data";
import { generateMorningBrief } from "@/lib/atlas/cio";
import { buildFallbackPriorities } from "@/lib/fallback-priorities";
import { buildPortfolioSnapshot } from "@/lib/portfolio";
import { formatEurCompact, formatPercent, formatDate, daysUntil } from "@/lib/format";
import { PORTFOLIO_STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

function todayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HomePage() {
  const [deals, operators, alerts, tasks] = await Promise.all([
    getDeals(),
    getOperators(),
    getAlerts(),
    getTasks(),
  ]);

  const brief = await generateMorningBrief({ deals, operators, alerts, tasks });
  const priorities = brief.generated ? brief.priorites : buildFallbackPriorities(deals, alerts, tasks);

  const snapshot = buildPortfolioSnapshot(deals, operators);

  const calendrier = deals
    .filter((d) => d.vote_expires_at || PORTFOLIO_STAGES.includes(d.stage))
    .map((d) => ({
      label: d.vote_expires_at ? `Vote — ${d.name}` : `Échéance — ${d.name}`,
      date: d.vote_expires_at ?? d.echeance_prevue,
      dealId: d.id,
    }))
    .filter((item) => {
      const jours = daysUntil(item.date);
      return jours >= 0 && jours <= 45;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div>
      <div className="mb-8 border-b border-line pb-6">
        <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-faint">
          {todayLabel()}
        </p>
        <h1 className="text-2xl font-light text-ink">Bonjour Nicolas.</h1>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader
              title="Aujourd'hui"
              subtitle="Jamais plus de cinq priorités. Ce qui ne mérite pas ton attention n'apparaît pas."
            />
            {priorities.length === 0 ? (
              <p className="py-6 text-sm text-muted">
                Aucune priorité critique aujourd'hui. Le portefeuille est stable.
              </p>
            ) : (
              <div>
                {priorities.map((p, i) => (
                  <PriorityCard key={i} priority={p} index={i} />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Note d'Atlas CIO" subtitle="Synthèse quotidienne, générée ce matin" />
            {brief.generated ? (
              <div className="whitespace-pre-line text-sm leading-relaxed text-ink">
                {brief.note_cio}
              </div>
            ) : (
              <AtlasUnavailable reason={brief.reason} />
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <SectionLabel>Portefeuille</SectionLabel>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <StatTile label="Encours" value={formatEurCompact(snapshot.totalEngage)} />
              <StatTile
                label="Rendement pondéré"
                value={formatPercent(snapshot.rendementMoyenPondere)}
              />
              <StatTile label="Dossiers actifs" value={deals.length} />
              <StatTile
                label="Risque pondéré"
                value={`${snapshot.risqueMoyenPondere.toFixed(1)}/10`}
              />
            </div>
          </Card>

          <Card>
            <SectionLabel>Calendrier — 45 prochains jours</SectionLabel>
            <div className="mt-4 flex flex-col gap-3">
              {calendrier.length === 0 && (
                <p className="text-sm text-muted">Aucune échéance dans les 45 prochains jours.</p>
              )}
              {calendrier.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-ink">{item.label}</span>
                  <span className="tabular whitespace-nowrap text-faint">{formatDate(item.date)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel>Météo du marché</SectionLabel>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {brief.generated
                ? brief.synthese_marche
                : "Configurez Atlas (ANTHROPIC_API_KEY) pour recevoir une synthèse quotidienne du marché adaptée à ce portefeuille."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
