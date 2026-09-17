/*
  Warnings:

  - You are about to drop the column `platform` on the `project_observations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CrowdfundingConnectorStatus" AS ENUM ('OPERATIONAL', 'PARTIAL', 'BLOCKED', 'TO_BUILD');

-- CreateEnum
CREATE TYPE "EntityLinkMatchType" AS ENUM ('DIRECT_ID', 'DOCUMENTED', 'POTENTIAL');

-- CreateEnum
CREATE TYPE "EntityLinkConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "EntityLinkStatus" AS ENUM ('SUGGESTED', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "projectObservationEventId" TEXT;

-- AlterTable
ALTER TABLE "project_observation_events" ADD COLUMN     "discoveredAlreadyOpen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBaseline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "sourceObservedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "project_observations" DROP COLUMN "platform",
ADD COLUMN     "announcedOpeningAt" TIMESTAMP(3),
ADD COLUMN     "effectiveOpeningAt" TIMESTAMP(3),
ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isBaseline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "crowdfunding_platforms" (
    "sourceKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "listingUrl" TEXT,
    "accessMethod" TEXT NOT NULL DEFAULT 'scraping',
    "connectorStatus" "CrowdfundingConnectorStatus" NOT NULL DEFAULT 'TO_BUILD',
    "authenticationRequiredForDocuments" BOOLEAN NOT NULL DEFAULT false,
    "coverageNotes" TEXT,
    "targetCheckFrequencySeconds" INTEGER NOT NULL DEFAULT 3600,
    "effectiveCheckFrequencySeconds" INTEGER,
    "baselineCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crowdfunding_platforms_pkey" PRIMARY KEY ("sourceKey")
);

-- CreateTable
CREATE TABLE "project_observation_entity_links" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "matchType" "EntityLinkMatchType" NOT NULL,
    "confidence" "EntityLinkConfidence" NOT NULL,
    "status" "EntityLinkStatus" NOT NULL DEFAULT 'SUGGESTED',
    "relationshipId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_observation_entity_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_observation_entity_links_organizationId_status_idx" ON "project_observation_entity_links"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_observation_entity_links_observationId_organization_key" ON "project_observation_entity_links"("observationId", "organizationId", "entityId");

-- CreateIndex
CREATE INDEX "project_observations_enrichedAt_idx" ON "project_observations"("enrichedAt");

-- Seed: les 5 plateformes pilotes connues (pilot-sources.config.ts, supprimé
-- par cette même livraison) migrent vers le registre en base. Statut
-- honnête : PARTIAL (code de connecteur existant, jamais observé contre une
-- page réelle depuis l'environnement de développement) — jamais OPERATIONAL
-- tant qu'un cycle réel n'a pas été confirmé en production (spec §1).
INSERT INTO "source_registry_entries" ("key","label","accessMethod","termsReviewed","reviewedAt","authenticationRequired","approvalStatus","updatedAt")
VALUES
  ('pilot-la-premiere-brique','La Première Brique (pilote)','scraping',true,CURRENT_TIMESTAMP,false,'APPROVED_FOR_COLLECTION',CURRENT_TIMESTAMP),
  ('pilot-clubfunding','ClubFunding (pilote)','scraping',true,CURRENT_TIMESTAMP,false,'APPROVED_FOR_COLLECTION',CURRENT_TIMESTAMP),
  ('pilot-homunity','Homunity (pilote)','scraping',true,CURRENT_TIMESTAMP,false,'APPROVED_FOR_COLLECTION',CURRENT_TIMESTAMP),
  ('pilot-fundimmo','Fundimmo (pilote)','scraping',true,CURRENT_TIMESTAMP,false,'APPROVED_FOR_COLLECTION',CURRENT_TIMESTAMP),
  ('pilot-raizers','Raizers (pilote)','scraping',true,CURRENT_TIMESTAMP,false,'APPROVED_FOR_COLLECTION',CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "crowdfunding_platforms" ("sourceKey","label","platformName","listingUrl","connectorStatus","updatedAt")
VALUES
  ('pilot-la-premiere-brique','La Première Brique (pilote)','La Première Brique','https://app.lapremierebrique.fr/projects','PARTIAL',CURRENT_TIMESTAMP),
  ('pilot-clubfunding','ClubFunding (pilote)','ClubFunding','https://www.clubfunding.fr/projets','PARTIAL',CURRENT_TIMESTAMP),
  ('pilot-homunity','Homunity (pilote)','Homunity','https://app.homunity.com/fr/nos-projets','PARTIAL',CURRENT_TIMESTAMP),
  ('pilot-fundimmo','Fundimmo (pilote)','Fundimmo','https://www.fundimmo.com/projets','PARTIAL',CURRENT_TIMESTAMP),
  ('pilot-raizers','Raizers (pilote)','Raizers','https://raizers.com/investir','PARTIAL',CURRENT_TIMESTAMP)
ON CONFLICT ("sourceKey") DO NOTHING;

-- Filet de sécurité : toute clé déjà présente dans project_observations (ex.
-- une source ajoutée manuellement après le pilote) mais absente des 5
-- ci-dessus reçoit une entrée minimale plutôt que de faire échouer la
-- contrainte de clé étrangère ajoutée plus bas.
DO $$
DECLARE
  orphan RECORD;
BEGIN
  FOR orphan IN
    SELECT DISTINCT po."sourceKey" AS key
    FROM "project_observations" po
    LEFT JOIN "crowdfunding_platforms" cp ON cp."sourceKey" = po."sourceKey"
    WHERE cp."sourceKey" IS NULL
  LOOP
    INSERT INTO "source_registry_entries" ("key","label","accessMethod","approvalStatus","updatedAt")
    VALUES (orphan.key, orphan.key, 'scraping', 'PENDING_REVIEW', CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO NOTHING;

    INSERT INTO "crowdfunding_platforms" ("sourceKey","label","platformName","connectorStatus","updatedAt")
    VALUES (orphan.key, orphan.key, orphan.key, 'TO_BUILD', CURRENT_TIMESTAMP)
    ON CONFLICT ("sourceKey") DO NOTHING;
  END LOOP;
END $$;

-- Taxonomie de relation dédiée au rapprochement Veille crowdfunding (spec §4) — même convention que le seed initial du Knowledge Graph v2 (clé stable, pas d'UI d'admin pour l'instant).
INSERT INTO "relationship_types" ("key", "label", "category", "description")
VALUES ('CROWDFUNDING_OBSERVED_LINK', 'Porteur observé en collecte externe', 'Financial', 'Rapprochement entre une entité Atlas et une collecte de crowdfunding observée sur le marché (Veille crowdfunding).')
ON CONFLICT ("key") DO NOTHING;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_projectObservationEventId_fkey" FOREIGN KEY ("projectObservationEventId") REFERENCES "project_observation_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crowdfunding_platforms" ADD CONSTRAINT "crowdfunding_platforms_sourceKey_fkey" FOREIGN KEY ("sourceKey") REFERENCES "source_registry_entries"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_observations" ADD CONSTRAINT "project_observations_sourceKey_fkey" FOREIGN KEY ("sourceKey") REFERENCES "crowdfunding_platforms"("sourceKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_observation_entity_links" ADD CONSTRAINT "project_observation_entity_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_observation_entity_links" ADD CONSTRAINT "project_observation_entity_links_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "project_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_observation_entity_links" ADD CONSTRAINT "project_observation_entity_links_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_observation_entity_links" ADD CONSTRAINT "project_observation_entity_links_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_observation_entity_links" ADD CONSTRAINT "project_observation_entity_links_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
