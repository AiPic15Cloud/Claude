import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketDigest } from '../hooks/use-market-digest';

const REASON_LABELS: Record<string, string> = {
  not_configured: "Résumé IA non activé (clé Anthropic non configurée côté serveur).",
  no_articles: "Pas encore assez d'actualités collectées pour générer un résumé.",
  error: 'Génération momentanément indisponible, réessaie plus tard.',
};

export function MarketDigestCard() {
  const { data, isLoading } = useMarketDigest();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Résumé IA · Aujourd'hui</CardTitle>
        {data?.available && <Badge variant="outline">Claude</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data?.available ? (
          <p className="text-xs text-muted-foreground">{REASON_LABELS[data?.reason ?? 'error']}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-primary">▸</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
