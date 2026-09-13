/**
 * TVA Cashflow Engine (Complément H, H.3). Le régime de TVA d'une acquisition
 * n'est pas qu'une case à cocher — quand la TVA est due sur le prix total
 * avec option d'assujettissement aux loyers, elle est décaissée à
 * l'acquisition puis récupérée seulement après le délai déclaratif
 * (CA3 mensuel ~M+3, régime simplifié annuel ~M+13/14) : le montant net de
 * TVA est nul à terme, mais ce décalage de trésorerie dégrade réellement le
 * TRI investisseur — jamais absorbé silencieusement dans un seul poste
 * "frais d'acquisition".
 *
 * MARGE (TVA calculée par le vendeur sur sa seule marge, embarquée dans le
 * prix négocié) et NON_ASSUJETTI ne génèrent aucun événement de trésorerie
 * distinct côté acheteur — seul PRIX_TOTAL_OPTION_LOYERS a cet effet de
 * calendrier.
 */

export type TvaRegime = 'NON_ASSUJETTI' | 'MARGE' | 'PRIX_TOTAL_OPTION_LOYERS';

export const DEFAULT_TVA_TAUX_PCT = 20;
export const DEFAULT_TVA_RECUPERATION_DELAI_MOIS = 3;

export interface TvaCashflowEvent {
  monthsFromAcquisition: number;
  amount: number;
  label: string;
}

export interface TvaCashflowInput {
  regimeTva: TvaRegime;
  prixNetVendeur: number;
  tvaTauxPct: number | null;
  tvaRecuperationDelaiMois: number | null;
}

export function computeTvaCashflowEvents(input: TvaCashflowInput): TvaCashflowEvent[] {
  if (input.regimeTva !== 'PRIX_TOTAL_OPTION_LOYERS') return [];

  const tauxPct = input.tvaTauxPct ?? DEFAULT_TVA_TAUX_PCT;
  const delaiMois = input.tvaRecuperationDelaiMois ?? DEFAULT_TVA_RECUPERATION_DELAI_MOIS;
  const montantTva = input.prixNetVendeur * (tauxPct / 100);

  return [
    { monthsFromAcquisition: 0, amount: -montantTva, label: `TVA sur le prix (${tauxPct}%) décaissée à l'acquisition` },
    { monthsFromAcquisition: delaiMois, amount: montantTva, label: `Récupération TVA (délai déclaratif ${delaiMois} mois)` },
  ];
}
