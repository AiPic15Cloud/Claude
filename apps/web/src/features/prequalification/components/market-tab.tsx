import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePrequalMarketStudy } from '../hooks/use-prequalification';

function pct(value: number | null): string {
  return value != null ? `${value > 0 ? '+' : ''}${value.toFixed(1)} %` : '—';
}

function euroPerSqm(value: number | null): string {
  return value != null ? `${formatCurrency(value)}/m²` : '—';
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

/**
 * Étude de marché automatisée (spec §10) — statistiques de population
 * comparable calculées à partir de transactions DVF réelles (Etalab/DGFiP),
 * jamais une estimation de marché générique. Périmètre = la commune
 * résolue, période = la dernière année geo-dvf disponible — simplifications
 * documentées (voir prequal-market-study.util.ts) ; §10.4 (analyses par
 * typologie détaillées) reste hors de ce P1.
 */
export function MarketTab({ caseId }: { caseId: string }) {
  const { data: study, isLoading } = usePrequalMarketStudy(caseId);

  if (isLoading) return null;

  if (!study) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Aucune étude de marché disponible — renseignez la ville et le code postal du projet (onglet Projet), ou aucune transaction DVF n'a été trouvée pour cette commune.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Population comparable</CardTitle>
          <Badge variant="outline">{study.filters.commune ?? '—'}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {study.liquidity.echantillonTropFaible && (
            <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              Échantillon trop faible ({study.population.count} transaction{study.population.count > 1 ? 's' : ''}) — les statistiques ci-dessous perdent en fiabilité.
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Metric label="Médiane" value={euroPerSqm(study.population.median)} />
            <Metric label="Moyenne" value={euroPerSqm(study.population.average)} />
            <Metric label="Q1 / Q3" value={`${euroPerSqm(study.population.q1)} / ${euroPerSqm(study.population.q3)}`} />
            <Metric label="Min / Max" value={`${euroPerSqm(study.population.min)} / ${euroPerSqm(study.population.max)}`} />
            <Metric label="Échantillon" value={`${study.population.count} transaction${study.population.count > 1 ? 's' : ''}`} />
            <Metric label="Nature du bien" value={study.filters.natureBien} />
            <Metric label="Source" value={study.filters.source} />
            <Metric label="Date d'extraction" value={formatDate(study.filters.dateExtraction)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Positionnement du projet</CardTitle>
        </CardHeader>
        <CardContent>
          {study.positioning.prixSortiePondereParM2 === null ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Renseignez des lots avec prix et surface (onglet Lots) pour positionner le projet vs le marché.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Metric label="Prix de sortie pondéré" value={euroPerSqm(study.positioning.prixSortiePondereParM2)} />
              <Metric label="Écart à la médiane" value={pct(study.positioning.ecartMedianePct)} />
              <Metric label="Rang percentile" value={study.positioning.percentileRank != null ? `${study.positioning.percentileRank}e percentile` : '—'} />
              <Metric label="Ventes au-dessus du projet" value={study.positioning.ventesAuDessusDuProjetCount != null ? String(study.positioning.ventesAuDessusDuProjetCount) : '—'} />
              <Metric label="Ticket max observé" value={study.positioning.ticketMaxObserve != null ? formatCurrency(study.positioning.ticketMaxObserve) : '—'} />
              <Metric label="Écart au point mort" value={pct(study.positioning.ecartPointMortPct)} />
              <Metric
                label="Marge si vente à la médiane"
                value={study.positioning.margeSiVenteMediane != null ? formatCurrency(study.positioning.margeSiVenteMediane) : '—'}
                hint={study.positioning.margeSiVenteMedianePct != null ? pct(study.positioning.margeSiVenteMedianePct) : undefined}
              />
              <Metric label="Prix minimal pour marge cible" value={euroPerSqm(study.positioning.prixMinimalPourMargeCibleParM2)} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Liquidité</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Metric label="Ventes comparables sur la période" value={String(study.liquidity.ventesComparablesSurPeriode)} />
            <Metric label="Ventes par mois" value={study.liquidity.ventesParMois != null ? study.liquidity.ventesParMois.toFixed(1) : '—'} />
            <Metric label="Délai moyen entre deux ventes" value={study.liquidity.delaiMoyenEntreDeuxVentesJours != null ? `${Math.round(study.liquidity.delaiMoyenEntreDeuxVentesJours)} j` : '—'} />
            <Metric label="Lots du projet" value={String(study.liquidity.nombreDeLotsDuProjet)} />
            <Metric label="Durée théorique d'écoulement" value={study.liquidity.dureeTheoriqueEcoulementMois != null ? `${study.liquidity.dureeTheoriqueEcoulementMois.toFixed(1)} mois` : '—'} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Indicateur, pas une prévision certaine — calculé sur les transactions DVF de la commune, dernière année disponible uniquement (pas de fusion multi-années ni de rayon paramétrable en P1).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
