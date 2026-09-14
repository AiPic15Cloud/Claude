import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { useFractionalCapRateBuildUp, useFractionalDataConfidence, useFractionalRentalReversion } from '../hooks/use-fractional';
import {
  ELIGIBILITY_VERDICT_LABELS,
  IC_DECISION_STATUS_LABELS,
  type CapRateComparisonResult,
  type FractionalSynthese,
  type ICRecommendation,
} from '@/types';

function pct(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(digits)} %`;
}

function YieldStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

const ELIGIBILITY_VARIANT = { ELIGIBLE: 'success', MARGINAL: 'warning', INELIGIBLE: 'destructive' } as const;
const IC_STATUS_VARIANT = {
  APPROVE: 'success',
  APPROVE_SUBJECT_TO_CONDITIONS: 'warning',
  RESTRUCTURE: 'warning',
  HOLD: 'outline',
  DECLINE: 'destructive',
} as const;

function CapRateBreakdown({ label, result }: { label: string; result: CapRateComparisonResult }) {
  const { buildUp, impliedCapRatePct, gapPts } = result;
  return (
    <div className="rounded-lg border border-border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-lg font-semibold tabular-nums">{buildUp.capRatePct.toFixed(2)} %</p>
      <p className="text-[11px] text-muted-foreground">
        TEC10 {buildUp.tec10Pct.toFixed(2)}% + état {buildUp.conditionPremiumPct.toFixed(2)}pt + localisation {buildUp.locationPremiumPct.toFixed(2)}pt + liquidité{' '}
        {buildUp.liquidityPremiumPct.toFixed(2)}pt
      </p>
      <p className="mt-1 text-[11px]">
        Cap rate implicite : <span className="font-medium tabular-nums">{impliedCapRatePct.toFixed(2)} %</span> — écart{' '}
        <span className={`font-medium tabular-nums ${gapPts >= 0 ? 'text-success' : 'text-warning'}`}>
          {gapPts >= 0 ? '+' : ''}
          {gapPts.toFixed(2)} pt
        </span>
      </p>
    </div>
  );
}

function CapRateBuildUpCard({ projectId }: { projectId: string }) {
  const { data } = useFractionalCapRateBuildUp(projectId);
  if (!data || data.status === 'NOT_QUALIFIED') return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Cap Rate Build-Up (Complément H, H.3)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.status === 'TEC10_MISSING' ? (
          <p className="text-sm text-warning">
            TEC10 (taux OAT 10 ans) indisponible — ni override saisi (onglet Hypothèses), ni taux live en base. Le build-up de cap rate ne peut pas être calculé.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Décomposition transparente du cap rate (jamais un score opaque) — TEC10 {data.tec10Source === 'OVERRIDE' ? 'saisi manuellement' : 'live'}
              {data.tec10AsOf ? ` au ${new Date(data.tec10AsOf).toLocaleDateString('fr-FR')}` : ''}.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CapRateBreakdown label="Entrée" result={data.entry} />
              <CapRateBreakdown label="Sortie" result={data.exit} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RentalReversionCard({ projectId }: { projectId: string }) {
  const { data } = useFractionalRentalReversion(projectId);
  if (!data || data.totalCount === 0) return null;
  const { weightedReversionPct, overRentedCount, underRentedCount, atMarketCount, ervMissingCount, rentPctErvMissing } = data;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Rental Reversion (spec V3.1 §9)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Passing Rent vs ERV, pondéré par le loyer — un rendement élevé obtenu grâce à des loyers au-dessus du marché doit être pénalisé ; un actif
          sous-loué contient au contraire une réserve de croissance, sous réserve du risque de renouvellement.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <YieldStat
            label="Reversion pondérée"
            value={weightedReversionPct !== null ? `${weightedReversionPct >= 0 ? '+' : ''}${weightedReversionPct.toFixed(1)} %` : '—'}
            hint={weightedReversionPct === null ? 'Aucun bail avec ERV renseignée' : undefined}
          />
          <YieldStat label="Baux sur-loués" value={String(overRentedCount)} />
          <YieldStat label="Baux au marché" value={String(atMarketCount)} />
          <YieldStat label="Baux sous-loués" value={String(underRentedCount)} />
        </div>
        {ervMissingCount > 0 && (
          <p className="text-xs text-warning">
            ⚠️ {ervMissingCount} bail(x) sans ERV renseignée ({rentPctErvMissing.toFixed(0)}% du loyer total) — non compté dans la moyenne pondérée, pas
            traité comme "au marché" par défaut. Le Break Event Engine (onglet Risque &amp; IC) utilise également un proxy générique pour ces baux faute
            d'ERV.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Onglet Synthèse (spec V3 §25) — verdict, hurdle, rendements, WALB/WALT, Reverse Solver. */
export function SyntheseTab({ projectId, synthese, icRecommendation }: { projectId: string; synthese: FractionalSynthese; icRecommendation?: ICRecommendation }) {
  const { base, stressed, stressedIsFallback, eligibility, reverseSolver, platformProfile, dcfValuation, capexDataMissing } = synthese;
  const { data: dataConfidence } = useFractionalDataConfidence(projectId);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Décision</CardTitle>
            {icRecommendation ? (
              <Badge variant={IC_STATUS_VARIANT[icRecommendation.status]}>{IC_DECISION_STATUS_LABELS[icRecommendation.status]}</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Calcul en cours…</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!platformProfile && (
            <p className="text-sm text-muted-foreground">
              Aucun profil plateforme rattaché (onglet Structure) — hurdle à 0%, la décision n'est pas significative tant qu'un profil n'est pas assigné.
            </p>
          )}
          {icRecommendation && <p className="text-sm text-muted-foreground">{icRecommendation.recommendation}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <YieldStat label="Secured Net Yield" value={pct(eligibility.securedNetYieldPct)} />
            <YieldStat label="Hurdle plateforme" value={pct(eligibility.hurdlePct)} />
            <YieldStat label="Écart vs hurdle" value={`${eligibility.gapPct >= 0 ? '+' : ''}${eligibility.gapPct.toFixed(2)} pt`} />
            <YieldStat
              label="Confiance data"
              value={dataConfidence ? `${dataConfidence.scorePct}/100` : '—'}
              hint={dataConfidence && dataConfidence.missingCount > 0 ? `${dataConfidence.missingCount}/${dataConfidence.totalCount} champs critiques non sourcés` : 'Champs critiques sourcés'}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Éligibilité technique (secured yield vs hurdle) :</span>
            <Badge variant={ELIGIBILITY_VARIANT[eligibility.verdict]}>{ELIGIBILITY_VERDICT_LABELS[eligibility.verdict]}</Badge>
            <span>— indicateur partiel, voir la Décision ci-dessus et l'onglet Risque &amp; IC pour la recommandation complète.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rendements</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <YieldStat label="Gross Yield" value={pct(base.grossYieldPct)} hint="Loyer / prix net vendeur" />
          <YieldStat label="Gross Yield AI" value={pct(base.grossYieldAiPct)} hint="Loyer / coût acte en main" />
          <YieldStat label="Net Property Yield" value={pct(base.netPropertyYieldPct)} hint="NOI an 1 / coût acte en main" />
          <YieldStat label="Investor Net Yield" value={pct(base.investorNetYieldPct)} hint="Distribution an 1 / capital investi" />
          <YieldStat label="Secured Net Yield" value={pct(base.securedNetYieldPct)} hint="Baux SECURED/WATCH uniquement" />
          <YieldStat
            label="Stressed Net Yield"
            value={pct(stressed.investorNetYieldPct)}
            hint={stressedIsFallback ? 'Repli générique (aucun AssumptionSet Bear/Severe saisi)' : 'Scénario Bear/Severe saisi'}
          />
          <YieldStat label="Yield on Cost" value={pct(base.yieldOnCostPct)} hint="NOI an 1 / coût total" />
          <YieldStat label="IRR (TRI)" value={pct(base.irrPct)} />
          <YieldStat label="Equity Multiple" value={base.equityMultiple ? `${base.equityMultiple.toFixed(2)}x` : '—'} />
          {base.irrImpactFromTvaTimingPts !== null && (
            <YieldStat
              label="Impact TVA sur IRR"
              value={`${base.irrImpactFromTvaTimingPts >= 0 ? '+' : ''}${base.irrImpactFromTvaTimingPts.toFixed(2)} pt`}
              hint="Décalage de trésorerie TVA (H.3) — sans effet sur l'equity multiple"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Locatif</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <YieldStat label="WALB" value={base.leaseSecurity.walbYears ? `${base.leaseSecurity.walbYears.toFixed(1)} ans` : '—'} />
          <YieldStat label="WALT" value={base.leaseSecurity.waltYears ? `${base.leaseSecurity.waltYears.toFixed(1)} ans` : '—'} />
          <YieldStat label="Secured Rent" value={pct(base.leaseSecurity.securedRentPct, 1)} />
          <YieldStat label="Rent at Risk" value={pct(base.leaseSecurity.rentAtRiskPct, 1)} />
          <YieldStat
            label="Lease Coverage Ratio"
            value={base.leaseSecurity.leaseCoverageRatio !== null ? `${base.leaseSecurity.leaseCoverageRatio.toFixed(2)}x` : '—'}
            hint="WALB / durée de détention cible — < 1 : la durée ferme moyenne n'atteint pas l'horizon"
          />
          <YieldStat
            label="Renewal Dependency"
            value={pct(base.leaseSecurity.renewalDependencyPct, 1)}
            hint="Part des loyers dont le renouvellement n'est pas encore formalisé (en cours ou tacite)"
          />
        </CardContent>
      </Card>

      <RentalReversionCard projectId={projectId} />

      <CapRateBuildUpCard projectId={projectId} />

      {reverseSolver && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reverse Solver</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <span className="text-xs text-muted-foreground">Prix d'acquisition maximum pour tenir le hurdle</span>
              <p className="text-lg font-semibold tabular-nums">
                {reverseSolver.maxAcquisitionPrice.value !== null ? formatCurrency(reverseSolver.maxAcquisitionPrice.value) : 'Hors de portée'}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <span className="text-xs text-muted-foreground">Loyer total minimum pour tenir le hurdle</span>
              <p className="text-lg font-semibold tabular-nums">
                {reverseSolver.minSecuredRent.value !== null ? `${formatCurrency(reverseSolver.minSecuredRent.value)} / an` : 'Hors de portée'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cash-Flow annuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année</TableHead>
                  <TableHead>GPR</TableHead>
                  <TableHead>Vacance</TableHead>
                  <TableHead>EGI</TableHead>
                  <TableHead>OPEX</TableHead>
                  <TableHead>NOI</TableHead>
                  <TableHead>CAPEX</TableHead>
                  <TableHead>Coûts plateforme</TableHead>
                  <TableHead>CF distribuable</TableHead>
                  <TableHead>Distribution investisseur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {base.yearlyModel.map((y) => (
                  <TableRow key={y.year}>
                    <TableCell>{y.year}</TableCell>
                    <TableCell>{formatCurrency(y.grossPotentialRent)}</TableCell>
                    <TableCell>{formatCurrency(y.vacancyCreditLoss)}</TableCell>
                    <TableCell>{formatCurrency(y.effectiveGrossIncome)}</TableCell>
                    <TableCell>{formatCurrency(y.operatingExpenses)}</TableCell>
                    <TableCell>{formatCurrency(y.noi)}</TableCell>
                    <TableCell>
                      {y.capex > 0 ? (
                        formatCurrency(y.capex)
                      ) : capexDataMissing ? (
                        <span className="text-warning" title="Aucune ligne CAPEX saisie — donnée manquante, pas un CAPEX nul confirmé.">
                          ⚠️ Non renseigné
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(y.platformVehicleCosts)}</TableCell>
                    <TableCell>{formatCurrency(y.distributableCashFlow)}</TableCell>
                    <TableCell>{formatCurrency(y.investorDistribution)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Sortie</TableCell>
                  <TableCell colSpan={7} className="text-xs text-muted-foreground">
                    Produit net de cession
                  </TableCell>
                  <TableCell>{formatCurrency(base.terminalProceeds.netSaleProceeds)}</TableCell>
                  <TableCell>{formatCurrency(base.terminalProceeds.investorTerminalProceeds)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Valorisation DCF</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Somme des cash-flows niveau propriété (NOI − CAPEX) actualisés au taux d'actualisation de l'hypothèse, plus la valeur de sortie retenue actualisée à la fin de l'horizon de détention.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <YieldStat label="Taux d'actualisation" value={pct(dcfValuation.discountRatePct, 1)} />
            <YieldStat label="VA des cash-flows" value={formatCurrency(dcfValuation.presentValueOfCashFlows)} />
            <YieldStat label="VA de la valeur terminale" value={formatCurrency(dcfValuation.presentValueOfTerminalValue)} hint={`Sortie retenue : ${formatCurrency(dcfValuation.terminalValue)}`} />
            <YieldStat label="Valeur DCF de l'actif" value={formatCurrency(dcfValuation.totalValue)} />
          </div>
        </CardContent>
      </Card>

      {!base.sourcesUsesResult.balanced && (
        <Card className="border-warning">
          <CardContent className="py-3 text-sm text-warning">
            Sources ≠ Uses : écart de {formatCurrency(base.sourcesUsesResult.deltaSourcesUses)} — vérifier le plan de financement (onglet Acquisition).
          </CardContent>
        </Card>
      )}

      {capexDataMissing && (
        <Card className="border-warning">
          <CardContent className="py-3 text-sm text-warning">
            ⚠️ CAPEX non renseigné — aucune ligne saisie (onglet Acquisition). Le cash-flow ci-dessus n'est pas stressé sur ce poste ; ce n'est pas un CAPEX confirmé à zéro.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
