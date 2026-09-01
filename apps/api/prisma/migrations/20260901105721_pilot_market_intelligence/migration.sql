-- CreateEnum
CREATE TYPE "ProjectObservationStatus" AS ENUM ('A_VENIR', 'EN_COLLECTE', 'CLOTURE', 'RETIRE');

-- CreateTable
CREATE TABLE "project_observations" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "operatorRaw" TEXT,
    "amountTarget" DECIMAL(14,2),
    "ratePct" DECIMAL(5,2),
    "durationMonths" INTEGER,
    "sourceCategory" TEXT,
    "atlasSegment" TEXT,
    "mappingConfidence" TEXT,
    "location" TEXT,
    "status" "ProjectObservationStatus" NOT NULL DEFAULT 'EN_COLLECTE',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_observation_snapshots" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_observation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_observation_events" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "eventType" "CompetitorProjectEventType" NOT NULL,
    "previousStatus" "ProjectObservationStatus",
    "newStatus" "ProjectObservationStatus",
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_observation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_observations_sourceKey_idx" ON "project_observations"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "project_observations_sourceKey_projectUrl_key" ON "project_observations"("sourceKey", "projectUrl");

-- CreateIndex
CREATE INDEX "project_observation_snapshots_observationId_observedAt_idx" ON "project_observation_snapshots"("observationId", "observedAt");

-- CreateIndex
CREATE INDEX "project_observation_events_sourceKey_idx" ON "project_observation_events"("sourceKey");

-- AddForeignKey
ALTER TABLE "project_observation_snapshots" ADD CONSTRAINT "project_observation_snapshots_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "project_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

