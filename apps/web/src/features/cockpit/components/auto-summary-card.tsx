import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AutoSummaryCardProps {
  summary: string;
  generatedAt: string;
}

export function AutoSummaryCard({ summary, generatedAt }: AutoSummaryCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-foreground">{summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Résumé automatique généré à {new Date(generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' — '}les agents IA conversationnels (module Agents IA) arriveront dans une prochaine phase.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
