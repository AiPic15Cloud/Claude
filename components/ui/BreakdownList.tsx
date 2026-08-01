import { Card, CardHeader } from "@/components/ui/Card";
import { formatEurCompact, formatPercent } from "@/lib/format";
import type { BreakdownRow } from "@/lib/portfolio";

export function BreakdownList({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: BreakdownRow[];
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Aucune donnée.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">{row.label}</span>
                <span className="tabular text-xs text-muted">
                  {formatEurCompact(row.montant)} · {formatPercent(row.part)} · {row.nombre} dossier
                  {row.nombre > 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${Math.max(row.part, 1.5)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
