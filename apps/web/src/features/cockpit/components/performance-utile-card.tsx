import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineConversionResult } from '@/types';

/**
 * "Performance utile" (spec Cockpit/Fractionné P2 §4.1.5) — pistes reçues,
 * qualifiées, présentées, accords de principe, acquisitions signées, avec
 * taux de conversion et délai médian. Bascule sur les nombres bruts quand
 * l'échantillon est trop petit (spec : "avec deux dossiers, afficher les
 * nombres bruts, pas un pourcentage spectaculaire").
 */
export function PerformanceUtileCard({ data }: { data: PipelineConversionResult }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Performance utile — Fractionné</CardTitle>
        {data.sampleTooSmallForRates && (
          <p className="text-xs text-muted-foreground">
            {data.totalProjects} dossier{data.totalProjects > 1 ? 's' : ''} au total — nombres bruts affichés, taux de conversion pas encore significatifs.
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {data.stages.map((stage) => (
            <div key={stage.key} className="flex flex-col gap-1 rounded-lg border border-border p-3 text-center">
              <span className="font-mono text-2xl tabular-nums">{stage.count}</span>
              <span className="text-xs text-muted-foreground">{stage.label}</span>
            </div>
          ))}
        </div>
        {!data.sampleTooSmallForRates && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            {data.conversions.map((c) => (
              <div key={`${c.fromKey}-${c.toKey}`} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.stages.find((s) => s.key === c.fromKey)?.label} → {data.stages.find((s) => s.key === c.toKey)?.label}
                </span>
                <span className="tabular-nums">
                  {c.ratePct === null ? '—' : `${c.ratePct} %`}
                  {c.medianDays !== null && <span className="ml-2 text-xs text-muted-foreground">médiane {Math.round(c.medianDays)} j</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
