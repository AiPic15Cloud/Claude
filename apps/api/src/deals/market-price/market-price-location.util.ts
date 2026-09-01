/**
 * Résolution de la localisation de recherche pour C.8 (recherche de prix
 * au m² à la demande) — pur, aucune requête. Deal.postcode n'est jamais
 * dérivé de la géolocalisation (GeocodingService.geocode() ne renvoie que
 * lat/lng) : c'est un champ saisi par l'analyste à la création du dossier,
 * déjà exploitable tel quel pour la granularité arrondissement exigée par
 * la spec (Paris/Lyon/Marseille), sans nouvelle résolution géographique.
 */

export interface MarketSearchLocation {
  /** Requête à envoyer aux sites externes, ex. "Paris 11e" ou "Rennes". */
  query: string;
  /** Code postal complet si l'arrondissement a pu être résolu, sinon null. */
  arrondissementPostcode: string | null;
}

const CITY_DEPARTMENT_PREFIX: Record<string, { canonical: string; prefix: string }> = {
  paris: { canonical: 'Paris', prefix: '75' },
  lyon: { canonical: 'Lyon', prefix: '69' },
  marseille: { canonical: 'Marseille', prefix: '13' },
};

export function resolveMarketSearchLocation(
  city: string | null | undefined,
  postcode: string | null | undefined,
): MarketSearchLocation {
  const normalizedCity = city?.trim();
  if (!normalizedCity) return { query: '', arrondissementPostcode: null };

  const entry = CITY_DEPARTMENT_PREFIX[normalizedCity.toLowerCase()];
  if (entry && postcode && /^\d{5}$/.test(postcode) && postcode.startsWith(entry.prefix)) {
    const arrondissement = parseInt(postcode.slice(3), 10);
    if (arrondissement > 0) {
      return { query: `${entry.canonical} ${arrondissement}e`, arrondissementPostcode: postcode };
    }
  }

  return { query: normalizedCity, arrondissementPostcode: null };
}
