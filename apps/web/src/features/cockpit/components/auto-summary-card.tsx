import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AutoSummary, AutoSummaryItem } from '@/types';

interface AutoSummaryCardProps {
  summary: AutoSummary;
  generatedAt: string;
}

const SEVERITY_STYLES: Record<AutoSummaryItem['severity'], { dot: string; text: string }> = {
  critical: { dot: 'bg-destructive', text: 'text-destructive' },
  warning: { dot: 'bg-warning', text: 'text-warning' },
  info: { dot: 'bg-muted-foreground/50', text: 'text-muted-foreground' },
};

export function AutoSummaryCard({ summary, generatedAt }: AutoSummaryCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">{summary.headline}</p>

          {summary.items.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {summary.items.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', SEVERITY_STYLES[item.severity].dot)} />
                  <span className={cn('font-medium', SEVERITY_STYLES[item.severity].text)}>{item.label}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2.5 text-xs text-muted-foreground">
            Résumé automatique généré à {new Date(generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' — '}les agents IA conversationnels (module Agents IA) arriveront dans une prochaine phase.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
