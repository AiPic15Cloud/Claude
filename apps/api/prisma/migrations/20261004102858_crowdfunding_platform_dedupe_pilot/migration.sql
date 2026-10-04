-- Corrige un doublon introduit par la PR #49 (commit 6ea2f84) : les
-- sourceKey "homunity" et "la-premiere-brique" déclarés ce jour-là
-- référaient en réalité les mêmes plateformes que "pilot-homunity" et
-- "pilot-la-premiere-brique", déjà seedées par la migration
-- 20260916043945_crowdfunding_watch_lot1. Résultat visible en prod :
-- Homunity et La Première Brique apparaissaient deux fois dans "Couverture
-- des plateformes" (0 observation nulle part, les deux étant neuves).
--
-- Suppression des doublons (cascade jusqu'à crowdfunding_platforms via la
-- FK ; aucune observation n'existe encore sous ces clés d'après la
-- production au moment de cette migration) et report des constats de
-- reconnaissance du 04/10/2026 sur les lignes canoniques "pilot-*".

DELETE FROM "source_registry_entries" WHERE "key" IN ('homunity', 'la-premiere-brique');

-- La Première Brique : HTTP 403 confirmé en accès direct le 04/10/2026,
-- plus précis que le PARTIAL générique posé par le pilote d'origine (qui ne
-- reflétait que "code générique existant, jamais observé").
UPDATE "crowdfunding_platforms"
SET "connectorStatus" = 'BLOCKED',
    "coverageNotes" = 'Catalogue public identifié (https://app.lapremierebrique.fr/projects), mais requêtes directes reçues en HTTP 403 lors d''une reconnaissance le 04/10/2026, hors infrastructure Atlas. Adaptateur non développé — à réexaminer si un flux autorisé (API partenaire, export) devient disponible.'
WHERE "sourceKey" = 'pilot-la-premiere-brique' AND "coverageNotes" IS NULL;

-- Homunity : la ligne canonique pointe déjà vers le vrai catalogue
-- applicatif (app.homunity.com/fr/nos-projets) — on ne touche pas à son
-- statut, seulement une note additive sur ce qui a été vu le 04/10/2026.
UPDATE "crowdfunding_platforms"
SET "coverageNotes" = 'Reconnaissance du 04/10/2026 : une page publique de présentation du fractionné a aussi été repérée (https://www.homunity.com/immobilier-fractionne), distincte du catalogue applicatif ci-dessus. Catalogue, pagination et extraction détaillée non audités pour autant.'
WHERE "sourceKey" = 'pilot-homunity' AND "coverageNotes" IS NULL;
