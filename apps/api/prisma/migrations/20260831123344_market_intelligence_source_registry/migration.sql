-- CreateEnum
CREATE TYPE "CompetitorProjectEventType" AS ENUM ('PROJECT_DETECTED', 'FUNDING_OPENED', 'FUNDING_CLOSED', 'PROJECT_REMOVED', 'PROJECT_UPDATED');

-- CreateEnum
CREATE TYPE "SourceHealth" AS ENUM ('OPERATIONAL', 'DEGRADED', 'BROKEN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SourceApprovalStatus" AS ENUM ('APPROVED_FOR_COLLECTION', 'PENDING_REVIEW');

-- CreateTable
CREATE TABLE "competitor_project_events" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "eventType" "CompetitorProjectEventType" NOT NULL,
    "previousStatus" "CompetitorProjectStatus",
    "newStatus" "CompetitorProjectStatus",
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_project_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_registry_entries" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "accessMethod" TEXT NOT NULL,
    "termsReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "authenticationRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "SourceApprovalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "health" "SourceHealth" NOT NULL DEFAULT 'UNKNOWN',
    "lastChangeAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_registry_entries_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "platform_stats_snapshots" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_stats_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competitor_project_events_entityId_idx" ON "competitor_project_events"("entityId");

-- CreateIndex
CREATE INDEX "platform_stats_snapshots_entityId_observedAt_idx" ON "platform_stats_snapshots"("entityId", "observedAt");

-- AddForeignKey
ALTER TABLE "competitor_project_events" ADD CONSTRAINT "competitor_project_events_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_stats_snapshots" ADD CONSTRAINT "platform_stats_snapshots_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed du Source Registry (spec ATLAS v2, C.2) — état réel des 6 connecteurs
-- déjà en production, pas une valeur par défaut arbitraire. "barometer" est
-- marqué APPROVED_FOR_COLLECTION sur confirmation explicite que son accès a
-- déjà été revu (scraping d'une page publique, sans authentification).
INSERT INTO "source_registry_entries" ("key", "label", "accessMethod", "termsReviewed", "reviewedAt", "authenticationRequired", "approvalStatus", "health", "updatedAt") VALUES
  ('barometer', 'Baromètre du crowdfunding immobilier', 'Page publique (scraping)', true, CURRENT_TIMESTAMP, false, 'APPROVED_FOR_COLLECTION', 'UNKNOWN', CURRENT_TIMESTAMP),
  ('data-gouv-catalogue', 'data.gouv.fr — Catalogue', 'API officielle', true, CURRENT_TIMESTAMP, false, 'APPROVED_FOR_COLLECTION', 'UNKNOWN', CURRENT_TIMESTAMP),
  ('data-gouv-dvf', 'data.gouv.fr — Valeurs foncières (DVF)', 'API officielle', true, CURRENT_TIMESTAMP, false, 'APPROVED_FOR_COLLECTION', 'UNKNOWN', CURRENT_TIMESTAMP),
  ('google-news-rss', 'Google News (flux RSS)', 'Flux RSS', true, CURRENT_TIMESTAMP, false, 'APPROVED_FOR_COLLECTION', 'UNKNOWN', CURRENT_TIMESTAMP),
  ('press-rss', 'Presse économique (flux RSS)', 'Flux RSS', true, CURRENT_TIMESTAMP, false, 'APPROVED_FOR_COLLECTION', 'UNKNOWN', CURRENT_TIMESTAMP),
  ('manual', 'Saisie manuelle', 'Saisie manuelle', true, CURRENT_TIMESTAMP, false, 'APPROVED_FOR_COLLECTION', 'OPERATIONAL', CURRENT_TIMESTAMP);
