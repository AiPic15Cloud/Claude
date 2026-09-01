-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'STATUS_CHANGED';

-- AlterTable
ALTER TABLE "graph_entities" ADD COLUMN     "siren" TEXT;

-- AlterTable
ALTER TABLE "risk_score_snapshots" ADD COLUMN     "modelVersion" TEXT NOT NULL DEFAULT 'risk-engine-v2.1';

-- CreateIndex
CREATE UNIQUE INDEX "graph_entities_organizationId_siren_key" ON "graph_entities"("organizationId", "siren");
