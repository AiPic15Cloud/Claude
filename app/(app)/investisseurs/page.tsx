import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDeals } from "@/lib/data";
import { computePortfolioPerformance } from "@/lib/investor-relations";
import { formatEur, formatEurCompact, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUT_LABELS = {
  projete: "Projeté",
  realise: "Réalisé",
  en_defaut: "En défaut",
} as const;

const STATUT_TONE = {
  projete: "neutral",
  realise: "low",
  en_defaut: "high",
} as const;

export default async function InvestorRelationsPage() {
  const deals = await getDeals();
  const perf = computePortfolioPerformance(deals);

  return (
    <div>
      <PageHeader
        eyebrow="Module 7"
        title="Investor Relations"
        subtitle="Rapport de performance généré automatiquement à partir du portefeuille financé. TRI cible tant qu'un dossier n'est pas remboursé ; TRI réalisé extrait du dossier une fois la sortie effective."
      />

      <div className="mb-6 grid grid-cols-2 gap-6 rounded border border-line bg-surface p-6 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Encours total" value={formatEurCompact(perf.totalEngage)} />
        <Metric label="TRI pondéré (cible)" value={formatPercent(perf.triPondere)} />
        <Metric label="Multiple pondéré" value={`${perf.multiplePondere.toFixed(2)}x`} />
        <Metric label="TVPI pondéré" value={`${perf.tvpiPondere.toFixed(2)}x`} />
        <Metric label="DPI pondéré" value={`${perf.dpiPondere.toFixed(2)}x`} />
      </div>

      <Card>
        <CardHeader
          title="Performance par dossier"
          subtitle="Multiple = valeur totale projetée ou réalisée / capital investi. TVPI et DPI sont calculés sans table de cashflows détaillée — voir méthode ci-dessous."
        />
        <div className="flex flex-col gap-2">
          {perf.deals.map((d) => (
            <Link
              key={d.dealId}
              href={`/pipeline/${d.dealId}`}
              className="flex flex-col gap-2 rounded border border-line px-4 py-3 transition-colors hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-ink">{d.name}</p>
                <p className="tabular text-xs text-muted">{formatEur(d.montant)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:gap-5">
                <span className="tabular text-muted">
                  TRI {d.triRealise ? `${formatPercent(d.triRealise)} (réalisé)` : `${formatPercent(d.triCible)} (cible)`}
                </span>
                <span className="tabular text-muted">Multiple {d.multiple.toFixed(2)}x</span>
                <span className="tabular text-muted">DPI {d.dpi.toFixed(2)}x</span>
                <Badge tone={STATUT_TONE[d.statut]}>{STATUT_LABELS[d.statut]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-6">
        <Card>
          <SectionLabel>Méthode</SectionLabel>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Ces indicateurs sont calculés à partir du montant engagé, du rendement cible et de la
            durée de chaque dossier — sans table de cashflows détaillée (appels de capital et
            distributions réelles). Le Multiple et le TVPI supposent une capitalisation annuelle du
            rendement sur la durée du dossier. Le DPI reste à 0 tant qu'un dossier n'est pas remboursé
            intégralement. Pour un rapport investisseur définitif, brancher les flux de trésorerie
            réels (Module Asset Management) affinera ces calculs.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-faint">{label}</p>
      <p className="tabular text-2xl font-light text-ink">{value}</p>
    </div>
  );
}
