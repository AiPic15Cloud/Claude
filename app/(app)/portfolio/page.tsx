import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge, severityTone } from "@/components/ui/Badge";
import { AtlasUnavailable } from "@/components/ui/AtlasUnavailable";
import { BreakdownList } from "@/components/ui/BreakdownList";
import { getDeals, getOperators } from "@/lib/data";
import {
  buildBreakdown,
  buildPortfolioSnapshot,
  computeStressTest,
  dureeBucket,
  montantBucket,
  rendementBucket,
} from "@/lib/portfolio";
import { generateRiskNote } from "@/lib/atlas/risk";
import { formatEur, formatEurCompact, formatPercent } from "@/lib/format";
import { DEAL_STAGE_LABELS, DEAL_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [deals, operators] = await Promise.all([getDeals(), getOperators()]);

  const snapshot = buildPortfolioSnapshot(deals, operators);
  const stress = computeStressTest(deals);
  const riskNote = await generateRiskNote(deals, operators);

  const breakdowns = {
    region: buildBreakdown(deals, (d) => d.region),
    operateur: buildBreakdown(deals, (d) => operators.find((o) => o.id === d.operator_id)?.name ?? d.operator_id),
    typologie: buildBreakdown(deals, (d) => DEAL_TYPE_LABELS[d.type]),
    montant: buildBreakdown(deals, (d) => montantBucket(d.montant)),
    rendement: buildBreakdown(deals, (d) => rendementBucket(d.rendement_cible)),
    duree: buildBreakdown(deals, (d) => dureeBucket(d.duree_mois)),
    banque: buildBreakdown(deals, (d) => d.banque ?? "Non renseignée"),
    origine: buildBreakdown(deals, (d) => d.origine),
    commercialisateur: buildBreakdown(deals, (d) => d.commercialisateur ?? "Aucun"),
    statut: buildBreakdown(deals, (d) => DEAL_STAGE_LABELS[d.stage]),
  };

  return (
    <div>
      <PageHeader
        eyebrow="Module 4"
        title="Portfolio"
        subtitle="Vision globale du portefeuille financé — répartitions, concentration, corrélations et stress tests."
      />

      <div className="mb-6 grid grid-cols-5 gap-6 rounded border border-line bg-surface p-6">
        <StatTile label="Encours total" value={formatEurCompact(snapshot.totalEngage)} />
        <StatTile label="Rendement pondéré" value={formatPercent(snapshot.rendementMoyenPondere)} />
        <StatTile label="Risque pondéré" value={`${snapshot.risqueMoyenPondere.toFixed(1)}/10`} />
        <StatTile label="Concentration top 3 opérateurs" value={formatPercent(snapshot.concentrationTop3Operateur)} />
        <StatTile label="Concentration top 3 régions" value={formatPercent(snapshot.concentrationTop3Region)} />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader title="Note Atlas Risk" subtitle="Indice de risque global et points d'attention" />
          {riskNote.generated ? (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="tabular text-3xl font-light text-ink">
                  {riskNote.indice_risque_global}
                </span>
                <span className="text-xs text-faint">/ 100 — indice de risque global</span>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted">{riskNote.synthese}</p>

              {riskNote.points_attention.length > 0 && (
                <div className="mb-4 flex flex-col gap-2.5">
                  {riskNote.points_attention.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Badge tone={severityTone(p.severite)}>{p.severite}</Badge>
                      <div>
                        <span className="text-ink">{p.titre}</span>
                        <span className="text-muted"> — {p.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {riskNote.recommandations.length > 0 && (
                <div>
                  <SectionLabel>Recommandations</SectionLabel>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {riskNote.recommandations.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink">
                        <span className="text-faint">—</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <AtlasUnavailable reason={riskNote.reason} />
          )}
        </Card>

        <Card>
          <CardHeader title="Stress test" subtitle="Estimation simplifiée, hors modèle actuariel" />
          <div className="flex flex-col gap-4">
            <div>
              <SectionLabel>Perte attendue simplifiée</SectionLabel>
              <p className="tabular mt-1 text-xl font-light text-ink">
                {formatEurCompact(stress.perteAttendueSimplifiee)}
              </p>
              <p className="text-xs text-faint">{formatPercent(stress.perteAttendueEnPourcentage)} de l'encours</p>
            </div>
            <div>
              <SectionLabel>Scénario dégradé</SectionLabel>
              <p className="tabular mt-1 text-lg font-light text-ink">
                {formatEurCompact(stress.scenarioDegrade.montant)}
              </p>
              <p className="text-xs leading-relaxed text-faint">{stress.scenarioDegrade.description}</p>
            </div>
            <div>
              <SectionLabel>Exposition par tranche de risque</SectionLabel>
              <div className="mt-2 flex flex-col gap-1.5">
                {stress.expositionParRisque.map((t) => (
                  <div key={t.tranche} className="flex items-center justify-between text-xs">
                    <span className="text-muted">{t.tranche}</span>
                    <span className="tabular text-ink">{formatEur(t.montant)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <p className="mb-3 text-micro font-medium uppercase tracking-wider text-faint">
        Diversification du portefeuille
      </p>
      <div className="grid grid-cols-2 gap-6">
        <BreakdownList title="Par région" rows={breakdowns.region} />
        <BreakdownList title="Par opérateur" rows={breakdowns.operateur} />
        <BreakdownList title="Par typologie" rows={breakdowns.typologie} />
        <BreakdownList title="Par montant engagé" rows={breakdowns.montant} />
        <BreakdownList title="Par rendement cible" rows={breakdowns.rendement} />
        <BreakdownList title="Par durée" rows={breakdowns.duree} />
        <BreakdownList title="Par banque" rows={breakdowns.banque} />
        <BreakdownList title="Par origine" rows={breakdowns.origine} />
        <BreakdownList title="Par commercialisateur" rows={breakdowns.commercialisateur} />
        <BreakdownList title="Par statut" rows={breakdowns.statut} />
      </div>
    </div>
  );
}
