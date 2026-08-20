import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { FinancialSynthesis } from '@/types';

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

/**
 * Synthèse calculée à partir du coût de revient détaillé + du financement
 * réel (dossier + Financement LPB + Financement bancaire optionnel) —
 * reproduit les indicateurs du classeur d'audit de l'utilisateur (ratios de
 * couverture LTA/LTC/LTV, exposition finale du porteur).
 */
export function FinancialSynthesisCard({ synthesis }: { synthesis: FinancialSynthesis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Synthèse & ratios</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Row label="Foncier" value={formatCurrency(synthesis.foncierTotal)} />
          <Row label="Travaux" value={formatCurrency(synthesis.travauxTotal)} />
          <Row label="Honoraires techniques" value={formatCurrency(synthesis.honorairesTechniquesTotal)} />
          <Row label="Autres frais (agence, bancaire divers, LPB)" value={formatCurrency(synthesis.agencyFees + synthesis.bankMiscFees + synthesis.lpb.totalFees)} />
          <Row label="Prix de Revient" value={formatCurrency(synthesis.coutDeRevient)} bold />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <Row label="Prix de Vente" value={formatCurrency(synthesis.prixDeVente)} />
          <Row label="Marge avant impôts" value={`${formatCurrency(synthesis.marge)} (${synthesis.margePct}%)`} bold />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Financement LPB</p>
          <Row label="Collecte" value={formatCurrency(synthesis.lpb.collecte)} />
          <Row label="Intérêts sur durée cible" value={formatCurrency(synthesis.lpb.interestOnDurationCible)} />
          <Row label="Fees TTC" value={formatCurrency(synthesis.lpb.feesTTC)} />
          {synthesis.lpb.hasActiveHypotheque && <Row label="Frais de garantie estimés (1,5 %)" value={formatCurrency(synthesis.lpb.guaranteeFeesEstimate)} />}
          <Row label="Montant décaissé net" value={formatCurrency(synthesis.lpb.netDisbursed)} bold />
        </div>

        {synthesis.bank.enabled && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">Financement bancaire — {synthesis.bank.name}</p>
            <Row label="Montant total" value={formatCurrency(synthesis.bank.loanTotal)} />
            <Row label="Intérêts sur durée cible" value={formatCurrency(synthesis.bank.interestOnDurationCible)} />
            <Row label="Frais TTC" value={formatCurrency(synthesis.bank.totalFees)} />
          </div>
        )}

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <Row label="Exposition finale du porteur" value={formatCurrency(synthesis.expositionFinale)} bold hint="Coût de revient − financement bancaire − collecte LPB" />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Ratios de couverture</p>
          <Row label="LTA (collecte / foncier)" value={formatRatio(synthesis.ratios.lta)} />
          <Row label="LTC (collecte / coût de revient)" value={formatRatio(synthesis.ratios.ltc)} />
          <Row label="LTV (collecte / prix de vente)" value={formatRatio(synthesis.ratios.ltv)} />
          {synthesis.bank.enabled && (
            <>
              <Row label="LTA + banque" value={formatRatio(synthesis.ratios.ltaAvecBanque)} />
              <Row label="LTC + banque" value={formatRatio(synthesis.ratios.ltcAvecBanque)} />
              <Row label="LTV + banque" value={formatRatio(synthesis.ratios.ltvAvecBanque)} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
