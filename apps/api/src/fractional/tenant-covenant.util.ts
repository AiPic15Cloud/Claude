import type { FractionalLeaseRenewalStatus } from '@prisma/client';

/**
 * Tenant Covenant Intelligence (spec V3 §8) — score 0-100 calculé à la
 * volée à partir des champs bruts du bail (jamais stocké, même principe que
 * le statut de sécurisation). Périmètre P1 volontairement réduit aux
 * dimensions directement dérivables des données déjà saisies (identité,
 * juridique, paiement, groupe, bail) — le bloc "Financier" (CA/EBITDA/
 * trésorerie) demanderait une saisie dédiée non construite ici, et le score
 * traite son absence comme neutre plutôt que pénalisant, pour ne jamais
 * laisser une donnée manquante se faire passer pour un risque avéré.
 */

export interface TenantCovenantInput {
  sirenLocataire: string | null;
  procedureCollective: boolean;
  garantieMaisonMere: boolean;
  statutRenouvellement: FractionalLeaseRenewalStatus;
  depotGarantieMontant: number | null;
  loyerFacialAnnuel: number;
  impayesNotes: string | null;
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

  return { score: Math.max(0, Math.min(100, score)), reasons };
}
