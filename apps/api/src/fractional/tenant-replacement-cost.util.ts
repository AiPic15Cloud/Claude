/**
 * Tenant Replacement Cost Engine (spec V3.1 §10) — jusqu'ici le coût de
 * relocation d'un bail en break (DOWNSIDE/SEVERE, break-event.util.ts)
 * n'existait que comme un seul montant agrégé (`relettingCapexPctOfRent`),
 * injecté dans le cash-flow sans aucune décomposition — exactement le
 * défaut que la doctrine "jamais un score composite opaque" (déjà
 * appliquée à cap-rate-build-up.util.ts) interdit ailleurs.
 *
 * Ce moteur ne recalcule PAS le CAPEX de relocation (résolveLeaseBreakEconomics,
 * break-event.util.ts, reste l'unique source de vérité pour le chiffre qui
 * alimente le cash-flow) — il le DÉCOMPOSE en lignes nommées, plus deux
 * postes réels non inclus dans ce CAPEX (loyer perdu pendant la vacance,
 * charges récupérables perdues), pour objectiver ce que "coûte" vraiment
 * un scénario de départ locataire (spec §10 : vacance, franchise/incentives,
 * honoraires, travaux, contribution bailleur, frais juridiques, charges
 * perdues — le CAPEX agrégé couvre travaux+honoraires+TI+juridique faute de
 * données de recette pour les ventiler plus finement ; les parts
 * ci-dessous sont des paramètres nommés explicites, à calibrer une fois des
 * dossiers réels disponibles, même principe que les constantes de
 * break-event.util.ts).
 */

export const REFURBISHMENT_SHARE_PCT = 55;
export const BROKERAGE_FEE_SHARE_PCT = 25;
export const LEGAL_FEES_SHARE_PCT = 10;
export const LANDLORD_TI_SHARE_PCT = 10;
// REFURBISHMENT + BROKERAGE + LEGAL + LANDLORD_TI = 100% du CAPEX de relocation.

export interface TenantReplacementCostInput {
  leaseId: string;
  tenantName: string;
  /** Loyer facial indexé de l'année du break (break-event.util.ts#resolveLeaseBreakEconomics). */
  preBreakAnnualRent: number;
  vacancyMonths: number;
  /** CAPEX de relocation déjà calculé par break-event.util.ts pour ce bail/scénario — jamais recalculé ici. */
  relettingCapexTotal: number;
  /** Loyer de reloc annuel (post-vacance) — sert de base au délai de récupération. */
  reletAnnualRent: number;
  /** OPEX en % de l'EGI (AssumptionSet) — sert de proxy aux charges récupérables perdues pendant la vacance. */
  opexPct: number;
  chargesRecuperables: boolean;
}

export interface TenantReplacementCostBreakdown {
  leaseId: string;
  tenantName: string;
  /** Loyer non perçu pendant la vacance — coût réel, distinct du CAPEX de relocation. */
  vacancyLostRent: number;
  /** Charges/TF non récupérées pendant la vacance (proxy OPEX × durée de vacance) — 0 si le bail n'est pas à charges récupérables. */
  lostRecoverableCharges: number;
  refurbishmentCost: number;
  brokerageFee: number;
  legalFees: number;
  landlordTiContribution: number;
  /** Somme de toutes les lignes ci-dessus. */
  totalEconomicCost: number;
  /** Années de loyer de reloc nécessaires pour absorber le coût total — proxy simple, pas un modèle actuariel. Null si le loyer de reloc est nul. */
  paybackYears: number | null;
}

export function computeTenantReplacementCost(input: TenantReplacementCostInput): TenantReplacementCostBreakdown {
  const vacancyLostRent = (input.preBreakAnnualRent / 12) * input.vacancyMonths;
  const lostRecoverableCharges = input.chargesRecuperables ? vacancyLostRent * (input.opexPct / 100) : 0;
  const refurbishmentCost = input.relettingCapexTotal * (REFURBISHMENT_SHARE_PCT / 100);
  const brokerageFee = input.relettingCapexTotal * (BROKERAGE_FEE_SHARE_PCT / 100);
  const legalFees = input.relettingCapexTotal * (LEGAL_FEES_SHARE_PCT / 100);
  const landlordTiContribution = input.relettingCapexTotal * (LANDLORD_TI_SHARE_PCT / 100);

  const totalEconomicCost = vacancyLostRent + lostRecoverableCharges + refurbishmentCost + brokerageFee + legalFees + landlordTiContribution;
  const paybackYears = input.reletAnnualRent > 0 ? totalEconomicCost / input.reletAnnualRent : null;

  return {
    leaseId: input.leaseId,
    tenantName: input.tenantName,
    vacancyLostRent,
    lostRecoverableCharges,
    refurbishmentCost,
    brokerageFee,
    legalFees,
    landlordTiContribution,
    totalEconomicCost,
    paybackYears,
  };
}
