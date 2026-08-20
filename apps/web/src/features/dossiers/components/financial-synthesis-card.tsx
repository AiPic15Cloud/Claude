import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { marginTier, MARGIN_TIER_STYLES } from '@/lib/margin';
import { cn } from '@/lib/utils';
import type { FinancialSynthesis } from '@/types';

// formatCurrency() abrège au-delà de 1M (ex. "1 M€") — trop imprécis pour une
// carte dont le but est justement de donner des chiffres exacts pour décider.
// Toujours la valeur exacte ici, arrondie à l'euro.
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function HeroTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'vert' | 'jaune' | 'orange' | 'rouge' }) {
  const style = tone ? MARGIN_TIER_STYLES[tone] : null;
  return (
    <div className={cn('flex flex-col gap-0.5 rounded-lg border border-border p-3', style && `${style.border} ${style.bg}`)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('text-lg font-semibold tabular-nums', style?.text)}>{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function DetailRow({ label, value, share, hint }: { label: string; value: string; share?: number; hint?: string }) {
  return (
    <div className="flex flex-col gap-1" title={hint}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      {share !== undefined && (
        <div className="h-1 rounded-full bg-muted">
          <div className="h-1 rounded-full bg-chart-accent" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, hint }: { label: string; value: string; bold?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm" title={hint}>
      <span className={bold ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={bold ? 'font-semibold tabular-nums' : 'tabular-nums'}>{value}</span>
    </div>
  );
}

function formatRatio(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function RatioPill({ label, value }: { label: string; value: number | null }) {
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{formatRatio(value)}</span>
    </Badge>
  );
}

/**
 * Synthèse calculée à partir du coût de revient détaillé + du financement
 * réel (dossier + Financement LPB + Financement bancaire optionnel) —
 * reproduit les indicateurs du classeur d'audit de l'utilisateur (ratios de
 * couverture LTA/LTC/LTV, exposition finale du porteur). Mise en page en 3
 * niveaux de lecture (chiffres clés → décomposition → détail du financement)
 * plutôt qu'une seule longue liste, pour rester lisible d'un coup d'œil.
 */
export function FinancialSynthesisCard({ synthesis }: { synthesis: FinancialSynthesis }) {
  const tier = marginTier(synthesis.margePct);
  const coutTotal = synthesis.coutDeRevient || 1;
  const autresFraisTotal = synthesis.agencyFees + synthesis.referralFees + synthesis.bankMiscFees + synthesis.lpb.totalFees;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Synthèse & ratios</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Chiffres clés */}
        <div className="grid grid-cols-2 gap-2.5">
          <HeroTile label="Prix de revient" value={formatCurrency(synthesis.coutDeRevient)} />
          <HeroTile
            label={synthesis.prixDeVenteSource === 'LOTS' ? `Prix de vente (${synthesis.saleLotsSummary?.count} lots)` : 'Prix de vente (estimation)'}
            value={formatCurrency(synthesis.prixDeVente)}
            hint={synthesis.saleLotsSummary ? `${synthesis.saleLotsSummary.soldCount}/${synthesis.saleLotsSummary.count} vendus` : "€/m² × surface"}
          />
          <HeroTile label="Marge avant impôts" value={`${formatCurrency(synthesis.marge)}`} hint={`${synthesis.margePct}%`} tone={tier} />
          <HeroTile label="Exposition finale" value={formatCurrency(synthesis.expositionFinale)} hint="Coût de revient − banque − collecte" />
        </div>

        {/* Décomposition du coût de revient */}
        <div className="flex flex-col gap-2.5 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Décomposition du coût de revient</p>
          <DetailRow label="Foncier" value={formatCurrency(synthesis.foncierTotal)} share={(synthesis.foncierTotal / coutTotal) * 100} />
          <DetailRow label="Travaux" value={formatCurrency(synthesis.travauxTotal)} share={(synthesis.travauxTotal / coutTotal) * 100} />
          <DetailRow
            label="Honoraires techniques"
            value={formatCurrency(synthesis.honorairesTechniquesTotal)}
            share={(synthesis.honorairesTechniquesTotal / coutTotal) * 100}
          />
          <DetailRow
            label="Autres frais"
            value={formatCurrency(autresFraisTotal)}
            share={(autresFraisTotal / coutTotal) * 100}
            hint="Agence + apport d'affaires + bancaire divers + frais LPB"
          />
        </div>

        {/* Financement — détail secondaire, replié visuellement derrière les chiffres clés ci-dessus */}
        <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Financement LPB</p>
            <Row label="Collecte" value={formatCurrency(synthesis.lpb.collecte)} />
            <Row label="Intérêts sur durée cible" value={formatCurrency(synthesis.lpb.interestOnDurationCible)} />
            <Row label="Fees TTC" value={formatCurrency(synthesis.lpb.feesTTC)} />
            {synthesis.lpb.hasActiveHypotheque && <Row label="Frais de garantie estimés (1,5 %)" value={formatCurrency(synthesis.lpb.guaranteeFeesEstimate)} />}
            <Row label="Montant décaissé net" value={formatCurrency(synthesis.lpb.netDisbursed)} bold />
          </div>

          {synthesis.bank.enabled && (
            <div className="flex flex-col gap-1 border-t border-border/60 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Financement bancaire — {synthesis.bank.name}</p>
              <Row label="Montant total" value={formatCurrency(synthesis.bank.loanTotal)} />
              <Row label="Intérêts sur durée cible" value={formatCurrency(synthesis.bank.interestOnDurationCible)} />
              <Row label="Frais TTC" value={formatCurrency(synthesis.bank.totalFees)} />
            </div>
          )}
        </div>

        {/* Ratios de couverture */}
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ratios de couverture</p>
          <div className="flex flex-wrap gap-1.5">
            <RatioPill label="LTA" value={synthesis.ratios.lta} />
            <RatioPill label="LTC" value={synthesis.ratios.ltc} />
            <RatioPill label="LTV" value={synthesis.ratios.ltv} />
            {synthesis.bank.enabled && (
              <>
                <RatioPill label="LTA + banque" value={synthesis.ratios.ltaAvecBanque} />
                <RatioPill label="LTC + banque" value={synthesis.ratios.ltcAvecBanque} />
                <RatioPill label="LTV + banque" value={synthesis.ratios.ltvAvecBanque} />
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            LTA = collecte / foncier · LTC = collecte / coût de revient · LTV = collecte / prix de vente
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
