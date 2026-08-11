import { Badge } from '@/components/ui/badge';
import {
  CATEGORY_LABELS,
  BUSINESS_MODEL_LABELS,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_VARIANT,
  type PlatformMetadata,
} from '../platform-metadata';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

function scoreVariant(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 60) return 'success';
  if (score >= 35) return 'warning';
  return 'destructive';
}

function scoreLabel(score: number): string {
  if (score >= 60) return 'Bon';
  if (score >= 35) return 'Moyen';
  return 'À surveiller';
}

export function PlatformStatsPanel({ metadata }: { metadata: PlatformMetadata | null | undefined }) {
  if (!metadata) {
    return <p className="text-xs text-muted-foreground">Aucune donnée pour cette plateforme.</p>;
  }

  const hasVeille = metadata.businessModel || metadata.verificationStatus || metadata.country || metadata.verificationNote;

  if (!metadata.source) {
    return (
      <div className="flex flex-col gap-3">
        {hasVeille ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {metadata.businessModel && (
                <Badge variant="secondary">{BUSINESS_MODEL_LABELS[metadata.businessModel] ?? metadata.businessModel}</Badge>
              )}
              {metadata.verificationStatus && (
                <Badge variant={VERIFICATION_STATUS_VARIANT[metadata.verificationStatus] ?? 'outline'}>
                  {VERIFICATION_STATUS_LABELS[metadata.verificationStatus] ?? metadata.verificationStatus}
                </Badge>
              )}
              {metadata.country && <Badge variant="outline">{metadata.country}</Badge>}
            </div>
            {metadata.verificationNote && <p className="text-xs text-muted-foreground">{metadata.verificationNote}</p>}
          </>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Aucune donnée du baromètre pour cette plateforme — clique sur « Actualiser (baromètre) » depuis la liste des
          plateformes.
        </p>
      </div>
    );
  }

  const rows: { label: string; value: string; warn?: boolean }[] = [
    metadata.totalFunded != null && { label: 'Total financé', value: formatCurrency(metadata.totalFunded) },
    metadata.projectCountFinanced != null && { label: 'Projets financés', value: String(metadata.projectCountFinanced) },
    metadata.capitalReimbursed != null && { label: 'Capital remboursé', value: formatCurrency(metadata.capitalReimbursed) },
    metadata.projectCountReimbursed != null && { label: 'Projets remboursés', value: String(metadata.projectCountReimbursed) },
    metadata.riskAmount != null && {
      label: 'Capital à risque',
      value: formatCurrency(metadata.riskAmount),
      warn: metadata.riskAmount > 0,
    },
    metadata.riskProjects != null && { label: 'Projets à risque', value: String(metadata.riskProjects) },
    metadata.capitalInDefault != null &&
      metadata.capitalInDefault > 0 && { label: 'Pertes définitives', value: formatCurrency(metadata.capitalInDefault), warn: true },
    metadata.averageLoanDuration != null && { label: 'Durée moy. des prêts', value: `${metadata.averageLoanDuration} mois` },
  ].filter(Boolean) as { label: string; value: string; warn?: boolean }[];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {metadata.category && <Badge variant="outline">{CATEGORY_LABELS[metadata.category] ?? metadata.category}</Badge>}
        {metadata.businessModel && (
          <Badge variant="secondary">{BUSINESS_MODEL_LABELS[metadata.businessModel] ?? metadata.businessModel}</Badge>
        )}
        {metadata.verificationStatus && (
          <Badge variant={VERIFICATION_STATUS_VARIANT[metadata.verificationStatus] ?? 'outline'}>
            {VERIFICATION_STATUS_LABELS[metadata.verificationStatus] ?? metadata.verificationStatus}
          </Badge>
        )}
        {metadata.isTerminated && <Badge variant="destructive">Plateforme fermée</Badge>}
        {metadata.atlasScore != null && (
          <Badge variant={scoreVariant(metadata.atlasScore)}>
            Score {Math.round(metadata.atlasScore)}/100 · {scoreLabel(metadata.atlasScore)}
          </Badge>
        )}
      </div>
      {metadata.verificationNote && <p className="text-xs text-muted-foreground">{metadata.verificationNote}</p>}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border p-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className={cn('font-medium tabular-nums', row.warn && 'text-warning')}>{row.value}</span>
          </div>
        ))}
      </div>

      {metadata.lastReportDate && (
        <p className="text-xs text-muted-foreground">
          Dernier rapport publié le {formatDate(metadata.lastReportDate)} — source : barometre-crowdfunding.com
        </p>
      )}
    </div>
  );
}
