import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AutoSummary, AutoSummaryItem } from '@/types';

const SEVERITY_STYLES: Record<AutoSummaryItem['severity'], { dot: string; text: string }> = {
  critical: { dot: 'bg-destructive', text: 'text-destructive' },
  warning: { dot: 'bg-warning', text: 'text-warning' },
  info: { dot: 'bg-muted-foreground/50', text: 'text-muted-foreground' },
};

/**
 * "Atlas Intelligence" — synthèse déterministe du dossier (calque
 * AutoSummaryCard du Cockpit), chaque phrase reprenant une valeur déjà
 * calculée par le Risk Engine/l'échéance/le recouvrement — jamais un texte
 * généré par un LLM présenté comme fait.
 */
export function DealNarrativeCard({ narrative }: { narrative?: AutoSummary }) {
  if (!narrative) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{narrative.headline}</p>
          {narrative.items.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {narrative.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', SEVERITY_STYLES[item.severity].dot)} />
                  <span className={cn(SEVERITY_STYLES[item.severity].text)}>{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
