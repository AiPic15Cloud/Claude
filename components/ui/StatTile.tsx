import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  delta,
  deltaTone = "neutral",
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
}) {
  const deltaColor =
    deltaTone === "positive"
      ? "text-risk-low"
      : deltaTone === "negative"
        ? "text-risk-high"
        : "text-muted";

  return (
    <div className="flex flex-col gap-1.5 border-l border-line pl-4 first:border-l-0 first:pl-0">
      <p className="text-micro font-medium uppercase tracking-wider text-faint">{label}</p>
      <p className="tabular text-2xl font-light text-ink">{value}</p>
      {delta && <p className={`text-xs ${deltaColor}`}>{delta}</p>}
    </div>
  );
}
