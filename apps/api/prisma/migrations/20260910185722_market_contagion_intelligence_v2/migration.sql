-- CreateEnum
CREATE TYPE "LegalEventType" AS ENUM ('REDRESSEMENT_JUDICIAIRE', 'LIQUIDATION_JUDICIAIRE', 'SAUVEGARDE', 'DISSOLUTION', 'RADIATION', 'CHANGEMENT_DIRIGEANT', 'CHANGEMENT_CONTROLE', 'AUTRE');

-- CreateEnum
CREATE TYPE "FinancialEventType" AS ENUM ('NOUVELLE_LEVEE', 'PROROGATION', 'RETARD', 'DEFAUT', 'REMBOURSEMENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "ContagionProximity" AS ENUM ('DIRECT', 'CONTROLE_GROUPE', 'OPERATEUR', 'HISTORIQUE');

-- CreateEnum
CREATE TYPE "ContagionSignalStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'DISMISSED');


-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'PERSON';

-- AlterTable
ALTER TABLE "relationships" ADD COLUMN     "confidenceScore" INTEGER,
ADD COLUMN     "observedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "economic_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "economic_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economic_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "economic_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "LegalEventType" NOT NULL,
    "source" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "FinancialEventType" NOT NULL,
    "amount" DECIMAL(14,2),
    "source" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contagion_signals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "legalEventId" TEXT,
    "financialEventId" TEXT,
    "proximity" "ContagionProximity" NOT NULL,
    "contagionDemonstrated" BOOLEAN NOT NULL DEFAULT false,
    "additionalExposure" DECIMAL(14,2),
    "explanation" TEXT NOT NULL,
    "status" "ContagionSignalStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "contagion_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "economic_groups_organizationId_idx" ON "economic_groups"("organizationId");

-- CreateIndex
CREATE INDEX "economic_group_members_entityId_idx" ON "economic_group_members"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "economic_group_members_groupId_entityId_key" ON "economic_group_members"("groupId", "entityId");

-- CreateIndex
CREATE INDEX "legal_events_organizationId_idx" ON "legal_events"("organizationId");

-- CreateIndex
CREATE INDEX "legal_events_entityId_idx" ON "legal_events"("entityId");

-- CreateIndex
CREATE INDEX "financial_events_organizationId_idx" ON "financial_events"("organizationId");

-- CreateIndex
CREATE INDEX "financial_events_entityId_idx" ON "financial_events"("entityId");

-- CreateIndex
CREATE INDEX "contagion_signals_organizationId_idx" ON "contagion_signals"("organizationId");

-- CreateIndex
CREATE INDEX "contagion_signals_dealId_idx" ON "contagion_signals"("dealId");

-- CreateIndex
CREATE INDEX "contagion_signals_sourceEntityId_idx" ON "contagion_signals"("sourceEntityId");

-- AddForeignKey
ALTER TABLE "economic_groups" ADD CONSTRAINT "economic_groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "economic_group_members" ADD CONSTRAINT "economic_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "economic_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "economic_group_members" ADD CONSTRAINT "economic_group_members_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_events" ADD CONSTRAINT "legal_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_events" ADD CONSTRAINT "legal_events_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagion_signals" ADD CONSTRAINT "contagion_signals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagion_signals" ADD CONSTRAINT "contagion_signals_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagion_signals" ADD CONSTRAINT "contagion_signals_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagion_signals" ADD CONSTRAINT "contagion_signals_legalEventId_fkey" FOREIGN KEY ("legalEventId") REFERENCES "legal_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagion_signals" ADD CONSTRAINT "contagion_signals_financialEventId_fkey" FOREIGN KEY ("financialEventId") REFERENCES "financial_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

