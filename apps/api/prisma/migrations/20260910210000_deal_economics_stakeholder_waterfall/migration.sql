-- CreateEnum
CREATE TYPE "StakeholderRole" AS ENUM ('INVESTOR', 'PLATFORM', 'SPONSOR', 'ARRANGER', 'ASSET_MANAGER', 'PROPERTY_MANAGER', 'LENDER', 'ADVISOR', 'OTHER');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('ENTRY', 'RUNNING', 'TRANSACTION', 'FINANCING', 'EXIT', 'CARRY', 'REVENUE_SHARE', 'CAPITAL_GAIN_SHARE');

-- CreateEnum
CREATE TYPE "FeeCalculationBase" AS ENUM ('PRIX_NET_VENDEUR', 'COUT_TOTAL', 'GAV', 'NAV', 'LOYERS_BRUTS', 'LOYERS_NETS', 'NOI', 'CAPITAL_COLLECTE', 'PLUS_VALUE', 'AUTRE');

-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('ONE_OFF', 'MENSUEL', 'TRIMESTRIEL', 'ANNUEL', 'SORTIE');

-- CreateEnum
CREATE TYPE "WaterfallTierType" AS ENUM ('PREFERRED_RETURN', 'RETURN_OF_CAPITAL', 'CATCH_UP', 'CARRIED_INTEREST', 'RESIDUAL_SPLIT');

-- CreateTable
CREATE TABLE "fractional_stakeholders" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "StakeholderRole" NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "capitalEngaged" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_stakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_fee_definitions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "ratePct" DECIMAL(6,3),
    "fixedAmount" DECIMAL(14,2),
    "calculationBase" "FeeCalculationBase" NOT NULL DEFAULT 'AUTRE',
    "frequency" "FeeFrequency" NOT NULL DEFAULT 'ANNUEL',
    "startYear" INTEGER,
    "endYear" INTEGER,
    "triggerNote" TEXT,
    "minAmount" DECIMAL(14,2),
    "maxAmount" DECIMAL(14,2),
    "source" TEXT,
    "confidence" TEXT,
    "scenarioBehavior" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_fee_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_waterfall_tiers" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "beneficiaryStakeholderId" TEXT,
    "order" INTEGER NOT NULL,
    "type" "WaterfallTierType" NOT NULL,
    "hurdleRatePct" DECIMAL(6,3),
    "catchUpPct" DECIMAL(5,2),
    "sharePct" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_waterfall_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_stakeholders_projectId_idx" ON "fractional_stakeholders"("projectId");

-- CreateIndex
CREATE INDEX "fractional_fee_definitions_projectId_idx" ON "fractional_fee_definitions"("projectId");

-- CreateIndex
CREATE INDEX "fractional_fee_definitions_stakeholderId_idx" ON "fractional_fee_definitions"("stakeholderId");

-- CreateIndex
CREATE INDEX "fractional_waterfall_tiers_projectId_order_idx" ON "fractional_waterfall_tiers"("projectId", "order");

-- AddForeignKey
ALTER TABLE "fractional_stakeholders" ADD CONSTRAINT "fractional_stakeholders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_fee_definitions" ADD CONSTRAINT "fractional_fee_definitions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_fee_definitions" ADD CONSTRAINT "fractional_fee_definitions_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "fractional_stakeholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_waterfall_tiers" ADD CONSTRAINT "fractional_waterfall_tiers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_waterfall_tiers" ADD CONSTRAINT "fractional_waterfall_tiers_beneficiaryStakeholderId_fkey" FOREIGN KEY ("beneficiaryStakeholderId") REFERENCES "fractional_stakeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

