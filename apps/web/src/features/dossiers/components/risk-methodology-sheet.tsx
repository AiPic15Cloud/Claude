import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useRiskMethodology } from '../hooks/use-risk-model';
import type { ScoreInputDefinition, EwsIndicatorDefinition } from '@/types';

function InputRow({ input }: { input: ScoreInputDefinition }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{input.label}</span>
        <span className="text-muted-foreground tabular-nums">poids {Math.round(input.weight * 100)}%</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{input.rationale}</p>
    </div>
  );
}

function EwsRow({ indicator }: { indicator: EwsIndicatorDefinition }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{indicator.label}</span>
        <span className="text-muted-foreground tabular-nums">jusqu'à +{indicator.maxPoints} pts</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{indicator.rationale}</p>
    </div>
  );
}

export function RiskMethodologySheet() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useRiskMethodology();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <BookOpen className="h-3.5 w-3.5" /> Méthodologie
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Méthodologie du Risk Engine</SheetTitle>
            <SheetDescription>Comment les scores sont calculés, et leurs limites actuelles.</SheetDescription>
          </SheetHeader>
          {isLoading || !data ? (
            <Skeleton className="mt-4 h-64 w-full" />
          ) : (
            <div className="mt-4 flex flex-col gap-5">
              <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-foreground">{data.calibrationDisclaimer}</div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Score composite</p>
                <p>
                  Quality {Math.round(data.composite.weights.quality * 100)}% · Performance {Math.round(data.composite.weights.performance * 100)}% · EWS{' '}
                  {Math.round(data.composite.weights.ews * 100)}%
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Quality Score — structurel, stable</p>
                <div className="flex flex-col gap-2">
                  {data.quality.map((f) => (
                    <InputRow key={f.key} input={f} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Performance Score — réel vs BP</p>
                <div className="flex flex-col gap-2">
                  {data.performance.map((f) => (
                    <InputRow key={f.key} input={f} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Early Warning Score (EWS) — signaux cumulatifs</p>
                <div className="flex flex-col gap-2">
                  {data.ews.map((i) => (
                    <EwsRow key={i.key} indicator={i} />
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Statuts de surveillance (score composite)</p>
                <p>
                  Faible : {data.surveillanceBands.FAIBLE} · Sous surveillance : {data.surveillanceBands.SOUS_SURVEILLANCE} · Élevé :{' '}
                  {data.surveillanceBands.ELEVE} · Critique : {data.surveillanceBands.CRITIQUE}
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Vélocité (fenêtre {data.velocityWindowDays}j)</p>
                <p>
                  Stable : {data.velocityBands.STABLE} · Détérioration : {data.velocityBands.DETERIORATION} · Dérive :{' '}
                  {data.velocityBands.DERIVE} · Détérioration rapide : {data.velocityBands.DETERIORATION_RAPIDE}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Hard overrides — planchers non compensables</p>
                <div className="flex flex-col gap-1.5">
                  {data.hardOverrideRules.map((r) => (
                    <div key={r.key} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs">
                      <span>{r.label}</span>
                      <span className="font-medium text-muted-foreground">{r.minimumSurveillanceStatus}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="border-t border-border pt-3 text-xs text-muted-foreground">{data.disclaimer}</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
