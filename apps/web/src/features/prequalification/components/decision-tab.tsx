import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError } from '@/lib/api';
import { useValidateAndPromote, useUpdatePrequalificationCase } from '../hooks/use-prequalification';
import { PostPromotionPanel } from './post-promotion-panel';
import { PREQUALIFICATION_ORIENTATION_LABELS, FINDING_SEVERITY_LABELS, type Finding, type PrequalificationOrientation } from '@/types';

const ORIENTATIONS = Object.keys(PREQUALIFICATION_ORIENTATION_LABELS) as PrequalificationOrientation[];

/** Ressenti du chargé d'affaires (Trame Prequal §6) — appréciation personnelle, éditable en continu, distincte du commentaire de décision figé à la validation. */
function AnalystImpressionCard({ caseId, note }: { caseId: string; note: string | null | undefined }) {
  const update = useUpdatePrequalificationCase(caseId);
  const [value, setValue] = useState(note ?? '');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ressenti du chargé d'affaires sur le projet</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({ analystImpressionNote: value || undefined });
          }}
          className="flex flex-col gap-3"
        >
          <Textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Appréciation qualitative du chargé d'affaires — pas un fait vérifié, un ressenti assumé comme tel." />
          <div>
            <Button type="submit" size="sm" variant="outline" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Décision (spec §3/§16.1) : synthèse des findings, choix d'orientation,
 * validation + promotion vers le Portefeuille (Deal, stage SOURCING) pour
 * GO/GO_SOUS_CONDITIONS. Un BLOCKING non résolu bloque un GO côté serveur —
 * affiché ici pour que l'analyste statue avant de tenter la validation.
 */
export function DecisionTab({
  caseId,
  version,
  currentOrientation,
  findings,
  promotedDealId,
  promotedVersionNumber,
  analystImpressionNote,
}: {
  caseId: string;
  version: number;
  currentOrientation: PrequalificationOrientation | null | undefined;
  findings: Finding[];
  promotedDealId: string | null | undefined;
  promotedVersionNumber: number | null | undefined;
  analystImpressionNote: string | null | undefined;
}) {
  const validate = useValidateAndPromote(caseId);
  const [orientation, setOrientation] = useState<PrequalificationOrientation>(currentOrientation ?? 'GO');
  const [decisionComment, setDecisionComment] = useState('');

  useEffect(() => {
    setOrientation(currentOrientation ?? 'GO');
  }, [currentOrientation]);

  const unresolvedBlocking = findings.filter((f) => f.severity === 'BLOCKING' && (f.reviewStatus === 'PENDING' || f.reviewStatus === 'ACCEPTED'));
  const bySeverity = (['BLOCKING', 'MATERIAL', 'WATCH', 'POSITIVE', 'INFO'] as const).map((sev) => ({
    severity: sev,
    count: findings.filter((f) => f.severity === sev).length,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionComment) return;
    validate.mutate({ expectedVersion: version, orientation, decisionComment });
  };

  if (promotedDealId) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="font-medium">Dossier promu dans le Portefeuille</p>
            <Link to={`/deals/${promotedDealId}`}>
              <Button>Voir le dossier dans le Portefeuille</Button>
            </Link>
          </CardContent>
        </Card>
        <PostPromotionPanel caseId={caseId} promotedDealId={promotedDealId} promotedVersionNumber={promotedVersionNumber} />
        <AnalystImpressionCard caseId={caseId} note={analystImpressionNote} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AnalystImpressionCard caseId={caseId} note={analystImpressionNote} />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Synthèse des findings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {bySeverity.map(({ severity, count }) => (
            <Badge key={severity} variant={severity === 'BLOCKING' && count > 0 ? 'destructive' : 'outline'}>
              {FINDING_SEVERITY_LABELS[severity]} : {count}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {unresolvedBlocking.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {unresolvedBlocking.length} point(s) bloquant(s) non résolu(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {unresolvedBlocking.map((f) => (
              <p key={f.id} className="text-sm">
                {f.statement}
              </p>
            ))}
            <p className="text-xs text-muted-foreground">
              Un GO est impossible tant que ces points ne sont pas résolus (onglet Findings). En GO sous conditions, chacun devient un jalon bloquant du Portefeuille.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Décision</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label>Orientation</Label>
              <Select value={orientation} onValueChange={(v) => setOrientation(v as PrequalificationOrientation)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIENTATIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {PREQUALIFICATION_ORIENTATION_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Commentaire de décision</Label>
              <Textarea rows={3} value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} required />
            </div>
            {(orientation === 'GO' || orientation === 'GO_SOUS_CONDITIONS') && (
              <p className="text-xs text-muted-foreground">
                {orientation === 'GO' ? 'Créera un dossier dans le Portefeuille (Sourcing).' : 'Créera un dossier dans le Portefeuille avec un jalon bloquant par point non résolu.'}
              </p>
            )}
            {validate.isError && (
              <p className="text-xs text-destructive">{validate.error instanceof ApiError ? validate.error.message : 'Une erreur est survenue.'}</p>
            )}
            <div>
              <Button type="submit" disabled={validate.isPending || !decisionComment}>
                {validate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Valider la décision
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
