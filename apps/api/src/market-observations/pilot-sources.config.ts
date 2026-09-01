/**
 * Les 5 sources pilotes de C.3 (spec ATLAS v2) — reprises telles quelles de
 * la watchlist déjà recherchée/vérifiée par un humain
 * (intelligence-concurrentielle/competitor-watchlist.ts), pour la
 * cohérence des noms de plateforme avec le reste de l'app.
 *
 * URLs de listing — statut de vérification par source (confirmé par
 * recherche indexée, l'accès direct restant bloqué depuis cet
 * environnement — voir project-observation-extractor.util.ts) :
 * - La Première Brique : le listing réel est sur le sous-domaine
 *   applicatif (`app.lapremierebrique.fr/projects`), pas le site vitrine
 *   deviné initialement.
 * - Homunity : idem, sous-domaine `app.homunity.com/fr/nos-projets`.
 * - ClubFunding, Fundimmo : le chemin deviné initialement est confirmé.
 * - Raizers : aucune page de listing n'a pu être localisée même par
 *   recherche indexée — URL ci-dessous reste une hypothèse non confirmée.
 * Le parsing de contenu (JSON-LD / RSC Next.js) reste non vérifié pour
 * les 5 sources dans tous les cas — seule l'existence/forme de l'URL a pu
 * être confirmée, jamais le contenu réel de la page.
 *
 * La diversité technique demandée par C.3 ("une facile, une dynamique, une
 * avec données riches, une à structure difficile, une prioritaire pour le
 * benchmark") reste également une hypothèse de sélection, pas un audit
 * technique réalisé — même si le fait que La Première Brique et Homunity
 * servent leur listing depuis une app séparée (probable SPA côté client)
 * en fait de bons candidats "structure difficile".
 */

export interface PilotSourceConfig {
  key: string;
  label: string;
  platform: string;
  listingUrl: string;
}

export const PILOT_SOURCE_CONFIGS: PilotSourceConfig[] = [
  { key: 'pilot-la-premiere-brique', label: 'La Première Brique (pilote)', platform: 'La Première Brique', listingUrl: 'https://app.lapremierebrique.fr/projects' },
  { key: 'pilot-clubfunding', label: 'ClubFunding (pilote)', platform: 'ClubFunding', listingUrl: 'https://www.clubfunding.fr/projets' },
  { key: 'pilot-homunity', label: 'Homunity (pilote)', platform: 'Homunity', listingUrl: 'https://app.homunity.com/fr/nos-projets' },
  { key: 'pilot-fundimmo', label: 'Fundimmo (pilote)', platform: 'Fundimmo', listingUrl: 'https://www.fundimmo.com/projets' },
  { key: 'pilot-raizers', label: 'Raizers (pilote)', platform: 'Raizers', listingUrl: 'https://www.raizers.com/fr/projets' },
];
