import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useRiskMethodology } from '../hooks/use-risk-model';

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
            <SheetDescription>Comment le score est calculé, et ses limites actuelles.</SheetDescription>
          </SheetHeader>
          {isLoading || !data ? (
            <Skeleton className="mt-4 h-64 w-full" />
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-foreground">{data.calibrationDisclaimer}</div>
              <div className="flex flex-col gap-3">
                {data.factors.map((f) => (
                  <div key={f.key} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-muted-foreground tabular-nums">poids {Math.round(f.weight * 100)}%</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.rationale}</p>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Paliers</p>
                <p>Sûr : {data.tiers.SAFE} · Vigilance : {data.tiers.WATCH} · Critique : {data.tiers.HIGH}</p>
              </div>
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">{data.disclaimer}</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
