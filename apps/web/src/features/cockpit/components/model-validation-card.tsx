import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRiskModelValidation } from '@/features/dossiers/hooks/use-risk-model';

const OUTCOME_LABELS: Record<'REMBOURSE' | 'DEFAUT', string> = { REMBOURSE: 'Remboursés', DEFAUT: 'En défaut' };

/**
 * Validation rétrospective du Risk Engine — rapproche le dernier score connu
 * des dossiers clos de leur résultat réel. Construite à partir de données
 * 100% réelles (jamais un historique simulé). Reste invisible tant que
 * l'effectif de clôtures est trop faible pour dire quoi que ce soit
 * (sampleTooSmall, seuil N=10 côté API) : la capture du score à la clôture
 * continue en arrière-plan sans coût, mais n'affiche rien tant qu'elle n'a
 * rien de solide à montrer plutôt que d'occuper de l'espace pour un
 * avertissement à chaque ouverture du Cockpit.
 */
export function ModelValidationCard() {
  const { data, isLoading } = useRiskModelValidation();

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.sampleTooSmall) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Validation du modèle</CardTitle>
        <span className="text-xs text-muted-foreground">{data.totalCount} dossier(s) clos noté(s)</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {(['REMBOURSE', 'DEFAUT'] as const).map((outcome) => {
            const group = data.outcomes[outcome];
            return (
              <div key={outcome} className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">{OUTCOME_LABELS[outcome]}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{group.count === 0 ? '—' : `${group.averageScore}/100`}</p>
                <p className="text-xs text-muted-foreground">{group.count} dossier(s) · score moyen au dernier calcul avant clôture</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Un modèle fiable attendrait un score moyen plus élevé côté « En défaut » que côté « Remboursés » — à surveiller au fil des
          clôtures, pas à l'instant sur un si petit effectif.
        </p>
        {data.cases.length > 0 && (
          <div className="border-t border-border pt-2 text-xs">
            {data.cases.slice(0, 5).map((c) => (
              <div key={c.dealId} className="flex items-center justify-between py-1">
                <Link to={`/deals/${c.dealId}`} className="hover:text-primary hover:underline">
                  {c.name}
                </Link>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {c.scoreAtClosure}/100 · {OUTCOME_LABELS[c.outcome]}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
