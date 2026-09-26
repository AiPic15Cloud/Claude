-- CreateEnum
CREATE TYPE "EconomicsNegotiationStatus" AS ENUM ('A_NEGOCIER', 'PROPOSEE', 'CONTRACTUALISEE');

-- AlterTable
ALTER TABLE "fractional_fee_definitions" ADD COLUMN     "contractReference" TEXT,
ADD COLUMN     "negotiationStatus" "EconomicsNegotiationStatus" NOT NULL DEFAULT 'A_NEGOCIER';

-- AlterTable
ALTER TABLE "fractional_waterfall_tiers" ADD COLUMN     "contractReference" TEXT,
ADD COLUMN     "negotiationStatus" "EconomicsNegotiationStatus" NOT NULL DEFAULT 'A_NEGOCIER';

-- CreateTable
CREATE TABLE "fractional_economics_term_versions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "feeDefinitionId" TEXT,
    "waterfallTierId" TEXT,
    "negotiationStatus" "EconomicsNegotiationStatus" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "contractReference" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_economics_term_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_structure_targets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "targetAmountEur" DECIMAL(14,2),
    "targetBasis" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_structure_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_decisions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "dossierVersion" INTEGER,
    "sourcesConsultees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decidedById" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_economics_term_versions_projectId_idx" ON "fractional_economics_term_versions"("projectId");

-- CreateIndex
CREATE INDEX "fractional_economics_term_versions_feeDefinitionId_idx" ON "fractional_economics_term_versions"("feeDefinitionId");

-- CreateIndex
CREATE INDEX "fractional_economics_term_versions_waterfallTierId_idx" ON "fractional_economics_term_versions"("waterfallTierId");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_structure_targets_organizationId_year_key" ON "fractional_structure_targets"("organizationId", "year");

-- CreateIndex
CREATE INDEX "fractional_decisions_projectId_idx" ON "fractional_decisions"("projectId");

-- AddForeignKey
ALTER TABLE "fractional_economics_term_versions" ADD CONSTRAINT "fractional_economics_term_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_economics_term_versions" ADD CONSTRAINT "fractional_economics_term_versions_feeDefinitionId_fkey" FOREIGN KEY ("feeDefinitionId") REFERENCES "fractional_fee_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_economics_term_versions" ADD CONSTRAINT "fractional_economics_term_versions_waterfallTierId_fkey" FOREIGN KEY ("waterfallTierId") REFERENCES "fractional_waterfall_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_economics_term_versions" ADD CONSTRAINT "fractional_economics_term_versions_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_structure_targets" ADD CONSTRAINT "fractional_structure_targets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_structure_targets" ADD CONSTRAINT "fractional_structure_targets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_decisions" ADD CONSTRAINT "fractional_decisions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_decisions" ADD CONSTRAINT "fractional_decisions_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
