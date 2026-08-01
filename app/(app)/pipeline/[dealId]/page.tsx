import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StageBadge } from "@/components/ui/StageBadge";
import { Badge, riskScoreTone } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { AtlasAnalystPanel } from "@/components/deal/AtlasAnalystPanel";
import {
  getDealById,
  getDealDocuments,
  getDealNotes,
  getDecisionsForDeal,
  getOperatorById,
} from "@/lib/data";
import { buildDealTimeline } from "@/lib/deal-timeline";
import { formatDate, formatEur, formatPercent } from "@/lib/format";
import { DEAL_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: { dealId: string } }) {
  const deal = await getDealById(params.dealId);
  if (!deal) notFound();

  const [operator, notes, documents, decisions] = await Promise.all([
    getOperatorById(deal.operator_id),
    getDealNotes(deal.id),
    getDealDocuments(deal.id),
    getDecisionsForDeal(deal.id),
  ]);

  const timeline = buildDealTimeline(deal, notes, documents, decisions);

  return (
    <div>
      <Link href="/pipeline" className="mb-4 inline-block text-xs text-faint hover:text-muted">
        ← Pipeline
      </Link>

      <PageHeader
        eyebrow={DEAL_TYPE_LABELS[deal.type]}
        title={deal.name}
        subtitle={deal.statut_detail}
        action={<StageBadge stage={deal.stage} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <AtlasAnalystPanel dealId={deal.id} />

          <Card>
            <CardHeader title="Timeline" subtitle="Historique complet du dossier" />
            <div className="flex flex-col">
              {timeline.map((entry, i) => (
                <div key={i} className="flex gap-4 border-b border-line py-3.5 last:border-b-0">
                  <span className="tabular w-24 shrink-0 pt-0.5 text-xs text-faint">
                    {formatDate(entry.date)}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-ink">{entry.label}</p>
                    {entry.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{entry.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Documents" subtitle={`${documents.length} document(s)`} />
            {documents.length === 0 ? (
              <p className="text-sm text-muted">Aucun document déposé.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded border border-line px-3.5 py-2.5"
                  >
                    <span className="text-sm text-ink">{doc.name}</span>
                    <Badge>{doc.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {decisions.length > 0 && (
            <Card>
              <CardHeader title="Minutes de comité" subtitle="Décisions et votes historiques" />
              <div className="flex flex-col gap-4">
                {decisions.map((d) => (
                  <div key={d.id} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-ink">{formatDate(d.committee_date)}</span>
                      <Badge tone={d.decision === "approuve" ? "low" : d.decision === "refuse" ? "high" : "medium"}>
                        {d.decision}
                      </Badge>
                      <span className="text-xs text-faint">{d.vote_result}</span>
                    </div>
                    <p className="mb-2 text-sm text-muted">{d.rationale}</p>
                    <ul className="flex flex-col gap-1">
                      {d.risques_identifies.map((r, i) => (
                        <li key={i} className="flex gap-2 text-xs text-faint">
                          <span>—</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <SectionLabel>Chiffres clés</SectionLabel>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <StatTile label="Montant" value={formatEur(deal.montant)} />
              <StatTile label="Rendement cible" value={formatPercent(deal.rendement_cible)} />
              <StatTile label="Durée" value={`${deal.duree_mois} mois`} />
              <StatTile label="Risque" value={`${deal.risque}/10`} />
            </div>
          </Card>

          <Card>
            <SectionLabel>Détails</SectionLabel>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Localisation" value={`${deal.ville}, ${deal.region}`} />
              <Row label="Banque" value={deal.banque ?? "—"} />
              <Row label="Origine" value={deal.origine} />
              <Row label="Commercialisateur" value={deal.commercialisateur ?? "—"} />
              <Row label="Échéance prévue" value={formatDate(deal.echeance_prevue)} />
              {deal.vote_expires_at && (
                <Row label="Vote de comité" value={formatDate(deal.vote_expires_at)} />
              )}
            </dl>
          </Card>

          {operator && (
            <Card>
              <SectionLabel>Opérateur</SectionLabel>
              <div className="mt-3">
                <Link href="/operateurs" className="text-sm font-medium text-ink hover:text-accent">
                  {operator.name}
                </Link>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <StatTile label="TRI moyen" value={formatPercent(operator.tri_moyen)} />
                  <StatTile label="Confiance" value={`${operator.indice_confiance}/100`} />
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
