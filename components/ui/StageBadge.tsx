import { Badge } from "@/components/ui/Badge";
import { DEAL_STAGE_LABELS, type DealStage } from "@/lib/types";

const STAGE_TONE: Record<DealStage, "neutral" | "low" | "medium" | "high" | "accent"> = {
  sourcing: "neutral",
  analyse: "neutral",
  comite: "accent",
  conditions: "medium",
  collecte: "medium",
  finance: "low",
  suivi: "low",
  rembourse: "neutral",
  defaut: "high",
};

export function StageBadge({ stage }: { stage: DealStage }) {
  return <Badge tone={STAGE_TONE[stage]}>{DEAL_STAGE_LABELS[stage]}</Badge>;
}
