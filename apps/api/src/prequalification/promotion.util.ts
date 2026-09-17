import { DealType, PrequalificationProjectType, PrequalLotStatus } from '@prisma/client';

/**
 * Registres fermés (même doctrine que `prequal-rules.util.ts` : jamais de
 * correspondance déduite dynamiquement) — le vocabulaire de la préqual
 * (spec ATLAS) et celui du Portefeuille (Deal/SaleLot, existants avant cette
 * spec) ne sont pas identiques terme à terme ; chaque correspondance est un
 * choix explicite, documenté ici plutôt que supposé évident.
 */

const PROJECT_TYPE_TO_DEAL_TYPE: Record<PrequalificationProjectType, DealType> = {
  LAND_DIVISION: 'DIVISION_FONCIERE',
  PROPERTY_TRADING_NO_WORKS: 'MARCHAND_DE_BIENS_SANS_TRAVAUX',
  PROPERTY_TRADING_WITH_WORKS: 'MARCHAND_DE_BIENS_AVEC_TRAVAUX',
  BUILDING_DIVISION: 'MISE_EN_COPROPRIETE',
  RESIDENTIAL_DEVELOPMENT: 'PROMOTION_IMMOBILIERE',
  COMMERCIAL_PROPERTY: 'PROMOTION_IMMOBILIERE',
  REFINANCING: 'REFINANCEMENT_ACTIF',
  OTHER: 'PROMOTION_IMMOBILIERE',
};

/** Aucun projectType saisi en préqual (champ optionnel) → type le plus générique du Portefeuille, jamais une devinette plus précise. */
export function mapProjectTypeToDealType(projectType: PrequalificationProjectType | null): DealType {
  return projectType ? PROJECT_TYPE_TO_DEAL_TYPE[projectType] : 'PROMOTION_IMMOBILIERE';
}

const LOT_STATUS_TO_SALE_LOT_STATUS: Record<PrequalLotStatus, string> = {
  NOT_MARKETED: 'EN_VENTE',
  MARKETED: 'EN_VENTE',
  INTEREST: 'EN_VENTE',
  OFFER: 'OFFRE',
  RESERVATION: 'RESERVATION',
  PROMISE: 'PROMESSE_COMPROMIS',
  DEED: 'VENDU',
}; // NOT_MARKETED/MARKETED/INTEREST n'ont pas d'équivalent dédié côté SaleLot.status — tous mappés sur EN_VENTE (statut par défaut), jamais un statut plus avancé que la réalité.

export function mapLotStatus(status: PrequalLotStatus): string {
  return LOT_STATUS_TO_SALE_LOT_STATUS[status];
}
