/**
 * Les 5 sources pilotes de C.3 (spec ATLAS v2) — reprises telles quelles de
 * la watchlist déjà recherchée/vérifiée par un humain
 * (intelligence-concurrentielle/competitor-watchlist.ts), pour la
 * cohérence des noms de plateforme avec le reste de l'app. Les URLs de
 * listing ci-dessous sont des hypothèses (conventions publiques usuelles),
 * NON VÉRIFIÉES depuis cet environnement (accès direct bloqué par le proxy
 * sortant de la session) — à confirmer et ajuster une fois déployé.
 *
 * La diversité technique demandée par C.3 ("une facile, une dynamique, une
 * avec données riches, une à structure difficile, une prioritaire pour le
 * benchmark") ne peut pas non plus être confirmée sans avoir pu visiter ces
 * pages — c'est une hypothèse de sélection, pas un audit technique réalisé.
 */

export interface PilotSourceConfig {
  key: string;
  label: string;
  platform: string;
  listingUrl: string;
}

export const PILOT_SOURCE_CONFIGS: PilotSourceConfig[] = [
  { key: 'pilot-la-premiere-brique', label: 'La Première Brique (pilote)', platform: 'La Première Brique', listingUrl: 'https://www.lapremierebrique.fr/projets' },
  { key: 'pilot-clubfunding', label: 'ClubFunding (pilote)', platform: 'ClubFunding', listingUrl: 'https://www.clubfunding.fr/projets' },
  { key: 'pilot-homunity', label: 'Homunity (pilote)', platform: 'Homunity', listingUrl: 'https://www.homunity.com/fr/projets' },
  { key: 'pilot-fundimmo', label: 'Fundimmo (pilote)', platform: 'Fundimmo', listingUrl: 'https://www.fundimmo.com/projets' },
  { key: 'pilot-raizers', label: 'Raizers (pilote)', platform: 'Raizers', listingUrl: 'https://www.raizers.com/fr/projets' },
];
