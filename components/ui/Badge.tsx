import type { ReactNode } from "react";

type Tone = "neutral" | "low" | "medium" | "high" | "accent";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-raised text-muted border-line",
  low: "bg-risk-low/10 text-risk-low border-risk-low/30",
  medium: "bg-risk-medium/10 text-risk-medium border-risk-medium/30",
  high: "bg-risk-high/10 text-risk-high border-risk-high/30",
  accent: "bg-accent/10 text-accent border-accent/30",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-micro font-medium uppercase tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function severityTone(severity: "critique" | "elevee" | "moderee"): Tone {
  if (severity === "critique") return "high";
  if (severity === "elevee") return "medium";
  return "low";
}

export function riskScoreTone(score: number): Tone {
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}
