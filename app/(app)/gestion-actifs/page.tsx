import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { Badge, severityTone } from "@/components/ui/Badge";
import { getAlerts, getDeals } from "@/lib/data";
import { formatDate, formatEur, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssetManagementPage() {
  const [deals, alerts] = await Promise.all([getDeals(), getAlerts()]);
  const activeDeals = deals.filter((d) => d.stage === "finance" || d.stage === "suivi");

  return (
    <div>
      <PageHeader
        eyebrow="Module 6"
        title="Asset Management"
        subtitle="Suivi opérationnel des actifs financés — travaux, commercialisation, échéances. Chaque retard déclenche automatiquement une alerte, visible ici et dans le Task Engine."
      />

      <div className="flex flex-col gap-3">
        {activeDeals.map((deal) => {
          const dealAlerts = alerts.filter((a) => a.related_deal_id === deal.id && !a.resolved);
          const jours = daysUntil(deal.echeance_prevue);
          return (
            <Card key={deal.id}>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <Link href={`/pipeline/${deal.id}`} className="text-sm font-medium text-ink hover:text-accent">
                    {deal.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">{formatEur(deal.montant)}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-faint">Échéance prévue</p>
                  <p className="tabular text-sm text-ink">
                    {formatDate(deal.echeance_prevue)}{" "}
                    <span className="text-faint">({jours >= 0 ? `${jours} j` : "dépassée"})</span>
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <SectionLabel>Statut actuel</SectionLabel>
                <p className="mt-1.5 text-sm text-muted">{deal.statut_detail}</p>
              </div>

              {dealAlerts.length > 0 && (
                <div>
                  <SectionLabel>Alertes ouvertes</SectionLabel>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {dealAlerts.map((a) => (
                      <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge tone={severityTone(a.severity)}>{a.type}</Badge>
                        <span className="text-muted">{a.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {activeDeals.length === 0 && (
          <p className="text-sm text-muted">Aucun actif en gestion active actuellement.</p>
        )}
      </div>
    </div>
  );
}
