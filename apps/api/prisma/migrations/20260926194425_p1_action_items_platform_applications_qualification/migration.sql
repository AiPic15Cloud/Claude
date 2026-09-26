-- CreateEnum
CREATE TYPE "FractionalPlatformApplicationStatus" AS ENUM ('PROSPECT', 'CONTACTE', 'CRITERES_PARTAGES', 'OFFRE_RECUE', 'ACCEPTEE', 'REFUSEE', 'ABANDONNEE');

-- CreateEnum
CREATE TYPE "ActionItemStatus" AS ENUM ('A_FAIRE', 'EN_ATTENTE_EXTERNE', 'A_DECIDER', 'TERMINEE', 'ECARTEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FractionalProjectStatus" ADD VALUE 'PISTE';
ALTER TYPE "FractionalProjectStatus" ADD VALUE 'QUALIFICATION';

-- AlterTable
ALTER TABLE "fractional_projects" ADD COLUMN     "entryChannel" TEXT,
ADD COLUMN     "nextActionLabel" TEXT,
ADD COLUMN     "nextActionOwnerId" TEXT,
ADD COLUMN     "priceRangeMaxEur" DECIMAL(14,2),
ADD COLUMN     "priceRangeMinEur" DECIMAL(14,2),
ADD COLUMN     "qualificationOpenQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "qualificationRisks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "qualificationStrengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "qualificationThesis" TEXT,
ADD COLUMN     "vendorContact" TEXT;

-- CreateTable
CREATE TABLE "fractional_platform_applications" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platformProfileId" TEXT NOT NULL,
    "status" "FractionalPlatformApplicationStatus" NOT NULL DEFAULT 'PROSPECT',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "firstContactDate" TIMESTAMP(3),
    "lastResponseDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "comparedCriteria" JSONB,
    "offerSummary" TEXT,
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_platform_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_status_history" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStatus" "FractionalProjectStatus",
    "toStatus" "FractionalProjectStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT,
    "fractionalProjectId" TEXT,
    "cause" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT,
    "status" "ActionItemStatus" NOT NULL DEFAULT 'A_FAIRE',
    "dueAt" TIMESTAMP(3),
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "deepLink" TEXT NOT NULL,
    "resolutionReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "history" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_platform_applications_projectId_idx" ON "fractional_platform_applications"("projectId");

-- CreateIndex
CREATE INDEX "fractional_platform_applications_platformProfileId_idx" ON "fractional_platform_applications"("platformProfileId");

-- CreateIndex
CREATE INDEX "fractional_status_history_projectId_idx" ON "fractional_status_history"("projectId");

-- CreateIndex
CREATE INDEX "action_items_organizationId_status_idx" ON "action_items"("organizationId", "status");

-- CreateIndex
CREATE INDEX "action_items_ownerId_status_idx" ON "action_items"("ownerId", "status");

-- CreateIndex
CREATE INDEX "action_items_dealId_cause_idx" ON "action_items"("dealId", "cause");

-- CreateIndex
CREATE INDEX "action_items_fractionalProjectId_cause_idx" ON "action_items"("fractionalProjectId", "cause");

-- AddForeignKey
ALTER TABLE "fractional_projects" ADD CONSTRAINT "fractional_projects_nextActionOwnerId_fkey" FOREIGN KEY ("nextActionOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_platform_applications" ADD CONSTRAINT "fractional_platform_applications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_platform_applications" ADD CONSTRAINT "fractional_platform_applications_platformProfileId_fkey" FOREIGN KEY ("platformProfileId") REFERENCES "platform_fractional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_platform_applications" ADD CONSTRAINT "fractional_platform_applications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_status_history" ADD CONSTRAINT "fractional_status_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_status_history" ADD CONSTRAINT "fractional_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_fractionalProjectId_fkey" FOREIGN KEY ("fractionalProjectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
