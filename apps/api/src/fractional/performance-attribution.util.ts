/**
 * Performance Attribution Engine (spec V3 §20.1) — décomposition simplifiée
 * de l'écart réalisé vs. Business Plan initial. Contrairement à l'exemple
 * de la spec ("-0,31 vacance, -0,22 CAPEX..."), qui suppose un modèle
 * capable d'isoler chaque effet indépendamment, cette version P1 compare
 * directement les grandeurs brutes (loyers/OPEX/CAPEX/distribution réels
 * vs. BP) et impute le solde non expliqué par ces trois lignes à
 * `autresFacteurs` (frais, valorisation, timing, effets d'interaction) —
 * une vraie décomposition multiplicative demanderait de rejouer le modèle
 * annuel avec chaque variable isolée tour à tour, hors périmètre P1.
 */

export interface PerformanceAttributionInput {
  loyersReels: number | null;
  opexReel: number | null;
  capexReel: number | null;
  distributionsReelles: number | null;
  loyerBp: number;
  opexBp: number;
  capexBp: number;
  distributionBp: number;
}

export interface PerformanceAttributionResult {
  loyerVariance: number | null;
  opexVariance: number | null;
  capexVariance: number | null;
  distributionVarianceTotal: number | null;
  autresFacteurs: number | null;
  summary: string;
}

export function computePerformanceAttribution(input: PerformanceAttributionInput): PerformanceAttributionResult {
  const loyerVariance = input.loyersReels !== null ? input.loyersReels - input.loyerBp : null;
  const opexVariance = input.opexReel !== null ? input.opexBp - input.opexReel : null; // OPEX réel > BP = variance négative (mauvais)
  const capexVariance = input.capexReel !== null ? input.capexBp - input.capexReel : null;
  const distributionVarianceTotal = input.distributionsReelles !== null ? input.distributionsReelles - input.distributionBp : null;

  const explained = (loyerVariance ?? 0) + (opexVariance ?? 0) + (capexVariance ?? 0);
  const autresFacteurs = distributionVarianceTotal !== null ? distributionVarianceTotal - explained : null;

  const parts: string[] = [];
  if (loyerVariance !== null) parts.push(`${loyerVariance >= 0 ? '+' : ''}${Math.round(loyerVariance).toLocaleString('fr-FR')} € loyers`);
  if (opexVariance !== null) parts.push(`${opexVariance >= 0 ? '+' : ''}${Math.round(opexVariance).toLocaleString('fr-FR')} € charges`);
  if (capexVariance !== null) parts.push(`${capexVariance >= 0 ? '+' : ''}${Math.round(capexVariance).toLocaleString('fr-FR')} € CAPEX`);
  if (autresFacteurs !== null) parts.push(`${autresFacteurs >= 0 ? '+' : ''}${Math.round(autresFacteurs).toLocaleString('fr-FR')} € autres facteurs`);
  const summary = distributionVarianceTotal !== null
    ? `Écart de distribution ${distributionVarianceTotal >= 0 ? '+' : ''}${Math.round(distributionVarianceTotal).toLocaleString('fr-FR')} € : ${parts.join(', ')}.`
    : 'Distribution réelle non renseignée.';

  return { loyerVariance, opexVariance, capexVariance, distributionVarianceTotal, autresFacteurs, summary };
}
