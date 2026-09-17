import { useNavigate } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrequalificationCases } from './hooks/use-prequalification';
import { CreateCaseDialog } from './components/create-case-dialog';
import { PREQUALIFICATION_STATUS_LABELS, PREQUALIFICATION_ORIENTATION_LABELS } from '@/types';

const ORIENTATION_VARIANT: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  GO: 'default',
  GO_SOUS_CONDITIONS: 'secondary',
  WAIT: 'outline',
  NO_GO_EN_L_ETAT: 'destructive',
};

/** Sas de préqualification (spec ATLAS v1.0) — dossiers avant leur promotion éventuelle dans le Portefeuille (stage SOURCING). */
export function PrequalificationListPage() {
  const navigate = useNavigate();
  const { data: cases, isLoading } = usePrequalificationCases();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Préqual"
        description="Analyse préparatoire d'un dossier avant son entrée dans le Portefeuille — fiche porteur/société/projet, bilan financier normalisé, findings et décision."
        actions={<CreateCaseDialog />}
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {!isLoading && cases?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-8 w-8" />
            <p>Aucun dossier de préqualification pour l'instant.</p>
            <CreateCaseDialog />
          </CardContent>
        </Card>
      )}

      {!isLoading && cases && cases.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <Card key={c.id} className="cursor-pointer transition-colors hover:border-primary/40" onClick={() => navigate(`/prequalification/${c.id}`)}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-tight">{c.name}</span>
                  <Badge variant="outline">{PREQUALIFICATION_STATUS_LABELS[c.status]}</Badge>
                </div>
                {c.orientation && <Badge variant={ORIENTATION_VARIANT[c.orientation]}>{PREQUALIFICATION_ORIENTATION_LABELS[c.orientation]}</Badge>}
                {c.assignedAnalyst && (
                  <span className="text-xs text-muted-foreground">
                    Analyste : {c.assignedAnalyst.firstName} {c.assignedAnalyst.lastName}
                  </span>
                )}
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{c._count?.findings ?? 0} finding(s)</span>
                  <span>{c._count?.documents ?? 0} document(s)</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
