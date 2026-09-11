import type { FractionalLeaseRenewalStatus } from '@prisma/client';

/**
 * Tenant Covenant Intelligence (spec V3 §8) — score 0-100 calculé à la
 * volée à partir des champs bruts du bail (jamais stocké, même principe que
 * le statut de sécurisation). Dimensions couvertes : identité, juridique,
 * paiement, groupe, bail, et bloc Financier (CA/EBITDA/trésorerie, saisie
 * manuelle depuis le dernier exercice connu du locataire). Ce dernier bloc
 * reste optionnel — un champ absent est traité comme neutre plutôt que
 * pénalisant, pour ne jamais laisser une donnée manquante se faire passer
 * pour un risque avéré.
 */

export interface TenantCovenantInput {
  sirenLocataire: string | null;
  procedureCollective: boolean;
  garantieMaisonMere: boolean;
  statutRenouvellement: FractionalLeaseRenewalStatus;
  depotGarantieMontant: number | null;
  loyerFacialAnnuel: number;
  impayesNotes: string | null;
  caLocataireAnnuel: number | null;
  ebitdaLocataireAnnuel: number | null;
  tresorerieLocataire: number | null;
}

export interface TenantCovenantResult {
  score: number;
  reasons: string[];
}

const BASE_SCORE = 70;

export function computeTenantCovenantScore(input: TenantCovenantInput): TenantCovenantResult {
  let score = BASE_SCORE;
  const reasons: string[] = [];

  if (input.procedureCollective) {
    score -= 50;
    reasons.push('Procédure collective en cours');
  }
  if (input.garantieMaisonMere) {
    score += 15;
    reasons.push('Garantie maison mère');
  }
  if (input.impayesNotes && input.impayesNotes.trim().length > 0) {
    score -= 15;
    reasons.push('Historique d\'impayés documenté');
  }
  if (input.statutRenouvellement === 'CONTESTE') {
    score -= 10;
    reasons.push('Renouvellement contesté');
  } else if (input.statutRenouvellement === 'DEPASSE') {
    score -= 8;
    reasons.push('Renouvellement dépassé');
  } else if (input.statutRenouvellement === 'TACITE') {
    score -= 4;
    reasons.push('Bail en tacite reconduction');
  }
  const depositMonths = input.depotGarantieMontant !== null && input.loyerFacialAnnuel > 0 ? (input.depotGarantieMontant / (input.loyerFacialAnnuel / 12)) : null;
  if (depositMonths !== null && depositMonths < 1) {
    score -= 5;
    reasons.push('Dépôt de garantie inférieur à 1 mois de loyer');
  } else if (depositMonths !== null && depositMonths >= 3) {
    score += 5;
    reasons.push('Dépôt de garantie ≥ 3 mois de loyer');
  }
  if (!input.sirenLocataire) {
    reasons.push('SIREN non renseigné — identité non vérifiable');
  }

  // Bloc Financier — CA/EBITDA/trésorerie du dernier exercice connu du
  // locataire. Chaque ratio n'est évalué que si les champs nécessaires sont
  // renseignés et le loyer est positif (aucune pénalité sur donnée absente).
  if (input.caLocataireAnnuel !== null && input.caLocataireAnnuel > 0 && input.loyerFacialAnnuel > 0) {
    const rentToRevenuePct = (input.loyerFacialAnnuel / input.caLocataireAnnuel) * 100;
    if (rentToRevenuePct > 15) {
      score -= 15;
      reasons.push(`Loyer représentant ${rentToRevenuePct.toFixed(1)}% du CA du locataire (> 15%)`);
    } else if (rentToRevenuePct > 10) {
      score -= 8;
      reasons.push(`Loyer représentant ${rentToRevenuePct.toFixed(1)}% du CA du locataire (> 10%)`);
    } else if (rentToRevenuePct < 3) {
      score += 5;
      reasons.push(`Loyer représentant seulement ${rentToRevenuePct.toFixed(1)}% du CA du locataire`);
    }
  }

  if (input.ebitdaLocataireAnnuel !== null && input.loyerFacialAnnuel > 0) {
    if (input.ebitdaLocataireAnnuel < 0) {
      score -= 25;
      reasons.push('EBITDA du locataire négatif');
    } else {
      const ebitdaCoverage = input.ebitdaLocataireAnnuel / input.loyerFacialAnnuel;
      if (ebitdaCoverage < 1) {
        score -= 20;
        reasons.push(`EBITDA du locataire inférieur au loyer annuel (couverture ${ebitdaCoverage.toFixed(1)}x)`);
      } else if (ebitdaCoverage < 2) {
        score -= 8;
        reasons.push(`Couverture EBITDA/loyer modérée (${ebitdaCoverage.toFixed(1)}x)`);
      } else if (ebitdaCoverage >= 4) {
        score += 5;
        reasons.push(`Couverture EBITDA/loyer confortable (${ebitdaCoverage.toFixed(1)}x)`);
      }
    }
  }

  if (input.tresorerieLocataire !== null && input.loyerFacialAnnuel > 0) {
    const quarterlyRent = input.loyerFacialAnnuel / 4;
    const treasuryCoverageQuarters = input.tresorerieLocataire / quarterlyRent;
    if (treasuryCoverageQuarters < 1) {
      score -= 10;
      reasons.push('Trésorerie du locataire inférieure à un trimestre de loyer');
    } else if (treasuryCoverageQuarters >= 4) {
      score += 5;
      reasons.push('Trésorerie du locataire couvrant au moins un an de loyer');
    }
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}
