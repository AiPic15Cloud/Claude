import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { ELIGIBILITY_VERDICT_LABELS, type FractionalSynthese } from '@/types';

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

const VERDICT_VARIANT = { ELIGIBLE: 'success', MARGINAL: 'warning', INELIGIBLE: 'destructive' } as const;

/** Onglet Synthèse (spec V3 §25) — verdict, hurdle, rendements, WALB/WALT, Reverse Solver. */
export function SyntheseTab({ synthese }: { synthese: FractionalSynthese }) {
  const { base, stressed, stressedIsFallback, eligibility, reverseSolver, platformProfile, dcfValuation } = synthese;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Verdict</CardTitle>
            <Badge variant={VERDICT_VARIANT[eligibility.verdict]}>{ELIGIBILITY_VERDICT_LABELS[eligibility.verdict]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!platformProfile && (
            <p className="text-sm text-muted-foreground">
              Aucun profil plateforme rattaché (onglet Structure) — hurdle à 0%, le verdict n'est pas significatif tant qu'un profil n'est pas assigné.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <YieldStat label="Secured Net Yield" value={pct(eligibility.securedNetYieldPct)} />
            <YieldStat label="Hurdle plateforme" value={pct(eligibility.hurdlePct)} />
            <YieldStat label="Écart vs hurdle" value={`${eligibility.gapPct >= 0 ? '+' : ''}${eligibility.gapPct.toFixed(2)} pt`} />
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
        </CardContent>
      </Card>

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
                    <TableCell>{y.capex > 0 ? formatCurrency(y.capex) : '—'}</TableCell>
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
    </div>
  );
}
