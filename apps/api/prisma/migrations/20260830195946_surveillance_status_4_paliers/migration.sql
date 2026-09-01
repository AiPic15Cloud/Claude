-- Renommages 1:1 (métadonnées uniquement, instantané, zéro perte de données)
ALTER TYPE "DealSurveillanceStatus" RENAME VALUE 'PERFORMING' TO 'FAIBLE';
ALTER TYPE "DealSurveillanceStatus" RENAME VALUE 'WATCH' TO 'SOUS_SURVEILLANCE';
ALTER TYPE "DealSurveillanceStatus" RENAME VALUE 'DRIFTING' TO 'ELEVE';
ALTER TYPE "DealSurveillanceStatus" RENAME VALUE 'DISTRESSED' TO 'CRITIQUE';

-- OUTPERFORMING et RECOVERY ne sont plus produits par le code applicatif à
-- partir de cette migration, mais restent des valeurs valides du type Postgres
-- (non supprimables sans recréer le type) — uniquement pour ne jamais casser
-- une ligne existante. L'historique (risk_score_snapshots) n'est jamais
-- réécrit : ces deux valeurs peuvent continuer d'y apparaître, le frontend
-- doit rester défensif sur les libellés manquants.

-- État live uniquement : Deal.surveillanceStatus est relu et agi en
-- permanence par le Risk Engine, doit toujours être l'une des 4 nouvelles
-- valeurs. OUTPERFORMING rejoint FAIBLE (même sens : "aucun signal").
UPDATE "deals" SET "surveillanceStatus" = 'FAIBLE' WHERE "surveillanceStatus" = 'OUTPERFORMING';

-- RECOVERY n'existe plus comme état transitoire : reclassement immédiat sur
-- le palier que le score composite actuel indiquerait sous la nouvelle
-- grille — valeur transitoire uniquement, le sweep au démarrage
-- (OnApplicationBootstrap) recalculera proprement chaque dossier dans les
-- secondes qui suivent le déploiement.
UPDATE "deals" SET "surveillanceStatus" = CASE
  WHEN "riskScore" > 50 THEN 'ELEVE'
  WHEN "riskScore" > 25 THEN 'SOUS_SURVEILLANCE'
  ELSE 'FAIBLE'
END::"DealSurveillanceStatus" WHERE "surveillanceStatus" = 'RECOVERY';

-- deal_overrides.overrideStatus est relu en permanence par le Risk Engine
-- pour les dossiers avec un override analyste ACTIF — doit rester valide.
-- automaticStatus est purement informatif (jamais relu), laissé tel quel
-- comme trace d'audit historique.
UPDATE "deal_overrides" SET "overrideStatus" = 'FAIBLE' WHERE "overrideStatus" = 'OUTPERFORMING' AND "active" = true;
UPDATE "deal_overrides" SET "overrideStatus" = 'SOUS_SURVEILLANCE' WHERE "overrideStatus" = 'RECOVERY' AND "active" = true;

-- risk_overrides.minimumSurveillanceStatus n'est en pratique jamais RECOVERY
-- (seule la règle DEFAUT_CARACTERISE l'utilisait, jamais évaluée dans le flux
-- standard) — corrigé par sécurité si une ligne active existait malgré tout.
UPDATE "risk_overrides" SET "minimumSurveillanceStatus" = 'CRITIQUE' WHERE "minimumSurveillanceStatus" = 'RECOVERY' AND "active" = true;

-- recoveryWatchUntil n'a plus d'usage (plus de cooldown RECOVERY à tracer)
ALTER TABLE "deals" DROP COLUMN "recoveryWatchUntil";
