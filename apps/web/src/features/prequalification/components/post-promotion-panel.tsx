import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { useDeal } from '@/features/portfolio/hooks/use-deals';
import { usePrequalVersions } from '../hooks/use-prequalification';
import {
  PREQUALIFICATION_ORIENTATION_LABELS,
  DEAL_STAGE_LABELS,
  DEAL_STATUS_LABELS,
  DEAL_RECOVERY_STATUS_LABELS,
} from '@/types';

const CLOSED_STAGES = new Set(['REMBOURSE', 'DEFAUT']);

/**
 * Suivi post-promotion (P2, scaffolding uniquement — spec §21 "boucle
 * d'amélioration" nécessite un historique réel de dossiers clôturés, qui
 * n'existe pas encore). Met en regard la décision d'origine (orientation
 * figée dans la PrequalificationVersion posée à la promotion, spec §17) et
 * l'état réel actuel du Deal — jamais une mesure de faux positifs/négatifs
 * ou une calibration inventée à partir d'un échantillon de taille 1.
 */
export function PostPromotionPanel({ caseId, promotedDealId, promotedVersionNumber }: { caseId: string; promotedDealId: string; promotedVersionNumber: number | null | undefined }) {
  const { data: versions } = usePrequalVersions(caseId);
  const { data: deal } = useDeal(promotedDealId);

  const originVersion = versions?.find((v) => v.versionNumber === promotedVersionNumber);
  const isClosed = deal ? CLOSED_STAGES.has(deal.stage) : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Suivi post-promotion</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Décision d'origine</span>
            {originVersion ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{PREQUALIFICATION_ORIENTATION_LABELS[originVersion.orientation]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(originVersion.validatedAt)}
                    {originVersion.validatedBy ? ` — ${originVersion.validatedBy.firstName} ${originVersion.validatedBy.lastName}` : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{originVersion.decisionComment}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">État réel actuel du Deal</span>
            {deal ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{DEAL_STAGE_LABELS[deal.stage]}</Badge>
                  <Badge variant="outline">{DEAL_STATUS_LABELS[deal.status]}</Badge>
                  {deal.recoveryStatus !== 'RAS' && <Badge variant="destructive">{DEAL_RECOVERY_STATUS_LABELS[deal.recoveryStatus]}</Badge>}
                  {deal.repaid && <Badge variant="success">Remboursé</Badge>}
                </div>
                {deal.realizedPerformance?.multipleCapital != null && (
                  <p className="text-sm text-muted-foreground">
                    Multiple réalisé : {deal.realizedPerformance.multipleCapital.toFixed(2)}x
                    {deal.realizedPerformance.triRealisePct != null ? ` · TRI réalisé : ${deal.realizedPerformance.triRealisePct.toFixed(1)} %` : ''}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {isClosed
            ? "Ce dossier est clôturé, mais un seul dossier ne permet aucune mesure fiable de faux positifs/négatifs ni aucune calibration des règles — cela nécessite un volume de dossiers clôturés (spec §21, P2)."
            : "Dossier encore en cours — trop tôt pour comparer la décision d'origine à un résultat réel. Cette comparaison ne devient significative qu'une fois le dossier remboursé ou en défaut, et sur un volume de dossiers suffisant."}
        </p>
      </CardContent>
    </Card>
  );
}
