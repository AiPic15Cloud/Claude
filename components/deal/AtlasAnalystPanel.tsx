"use client";

import { useState } from "react";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { Badge, riskScoreTone } from "@/components/ui/Badge";
import { AtlasUnavailable } from "@/components/ui/AtlasUnavailable";
import type { DealAnalysis, AtlasUnavailable as AtlasUnavailableResult } from "@/lib/atlas/analyst";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: DealAnalysis }
  | { status: "unavailable"; reason: string }
  | { status: "error"; message: string };

const VOTE_LABELS = {
  favorable: "Favorable",
  defavorable: "Défavorable",
  conditionnel: "Conditionnel",
};

const VOTE_TONE = {
  favorable: "low",
  defavorable: "high",
  conditionnel: "medium",
} as const;

export function AtlasAnalystPanel({ dealId }: { dealId: string }) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function runAnalysis() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/atlas/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const data = (await res.json()) as DealAnalysis | AtlasUnavailableResult;
      if (data.generated) {
        setState({ status: "done", result: data });
      } else {
        setState({ status: "unavailable", reason: data.reason });
      }
    } catch {
      setState({ status: "error", message: "Erreur réseau lors de l'appel à Atlas." });
    }
  }

  return (
    <Card>
      <CardHeader
        title="Analyse Atlas Analyst"
        subtitle="Résumé exécutif, scoring, risques et vote recommandé — générés à la demande"
        action={
          state.status !== "loading" && (
            <button
              onClick={runAnalysis}
              className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent/50 hover:bg-raised"
            >
              {state.status === "done" ? "Régénérer" : "Générer l'analyse"}
            </button>
          )
        }
      />

      {state.status === "idle" && (
        <p className="text-sm text-muted">
          Lance l'analyse pour obtenir un résumé exécutif, un scoring et un vote recommandé pour ce
          dossier.
        </p>
      )}

      {state.status === "loading" && (
        <p className="text-sm text-muted">Atlas Analyst examine le dossier…</p>
      )}

      {state.status === "unavailable" && <AtlasUnavailable reason={state.reason} />}

      {state.status === "error" && <p className="text-sm text-risk-high">{state.message}</p>}

      {state.status === "done" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Badge tone={riskScoreTone(11 - state.result.scoring)}>
              Score {state.result.scoring}/10
            </Badge>
            <Badge tone={VOTE_TONE[state.result.vote_recommande]}>
              Vote {VOTE_LABELS[state.result.vote_recommande]}
            </Badge>
          </div>

          <div>
            <SectionLabel>Résumé exécutif</SectionLabel>
            <p className="mt-2 text-sm leading-relaxed text-ink">{state.result.resume_executif}</p>
          </div>

          <div>
            <SectionLabel>Justification du vote</SectionLabel>
            <p className="mt-2 text-sm leading-relaxed text-muted">{state.result.justification}</p>
          </div>

          <ListSection title="Risques identifiés" items={state.result.risques} />
          <ListSection title="Questions pour l'opérateur" items={state.result.questions_pour_operateur} />
          <ListSection title="Conditions recommandées" items={state.result.conditions_recommandees} />
          <ListSection title="Documents manquants" items={state.result.documents_manquants} />
        </div>
      )}
    </Card>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <span className="text-faint">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
