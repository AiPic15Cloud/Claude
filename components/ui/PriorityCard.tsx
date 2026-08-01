import { Badge } from "@/components/ui/Badge";
import type { AtlasPriority, AtlasPriorityCategory } from "@/lib/atlas/cio";

const CATEGORY_LABELS: Record<AtlasPriorityCategory, string> = {
  operation_critique: "Opération critique",
  decision: "Décision à prendre",
  risque: "Nouveau risque",
  opportunite: "Opportunité",
  calendrier: "Calendrier",
};

const URGENCE_TONE = {
  haute: "high",
  moyenne: "medium",
  basse: "low",
} as const;

export function PriorityCard({ priority, index }: { priority: AtlasPriority; index: number }) {
  return (
    <div className="flex gap-4 border-b border-line py-4 last:border-b-0">
      <span className="tabular pt-0.5 text-sm text-faint">{String(index + 1).padStart(2, "0")}</span>
      <div className="flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <h3 className="text-sm font-medium text-ink">{priority.titre}</h3>
          <Badge tone={URGENCE_TONE[priority.urgence]}>{priority.urgence}</Badge>
          <span className="text-micro uppercase tracking-wider text-faint">
            {CATEGORY_LABELS[priority.categorie]}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted">{priority.description}</p>
      </div>
    </div>
  );
}
