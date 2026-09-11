-- CreateEnum
CREATE TYPE "ICDecisionStatus" AS ENUM ('APPROVE', 'APPROVE_SUBJECT_TO_CONDITIONS', 'RESTRUCTURE', 'HOLD', 'DECLINE');

-- CreateEnum
CREATE TYPE "ProjectOutcomeStatus" AS ENUM ('SUCCES', 'SOUS_PERFORMANCE', 'PERTE', 'REFUSE', 'ABANDONNE');

-- AlterTable
ALTER TABLE "fractional_leases" ADD COLUMN     "garantieMaisonMere" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "procedureCollective" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sirenLocataire" TEXT;

-- CreateTable
CREATE TABLE "fractional_ic_decisions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ICDecisionStatus" NOT NULL,
    "hardStops" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "watchItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendation" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_ic_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_project_actuals" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "loyersReels" DECIMAL(14,2),
    "occupationPct" DECIMAL(5,2),
    "opexReel" DECIMAL(14,2),
    "capexReel" DECIMAL(14,2),
    "distributionsReelles" DECIMAL(14,2),
    "valorisationReelle" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_project_actuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_project_outcomes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ProjectOutcomeStatus" NOT NULL,
    "triRealise" DECIMAL(6,3),
    "multipleRealise" DECIMAL(6,3),
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_project_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_ic_decisions_projectId_idx" ON "fractional_ic_decisions"("projectId");

-- CreateIndex
CREATE INDEX "fractional_project_actuals_projectId_idx" ON "fractional_project_actuals"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_project_outcomes_projectId_key" ON "fractional_project_outcomes"("projectId");

-- AddForeignKey
ALTER TABLE "fractional_ic_decisions" ADD CONSTRAINT "fractional_ic_decisions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_project_actuals" ADD CONSTRAINT "fractional_project_actuals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_project_outcomes" ADD CONSTRAINT "fractional_project_outcomes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

