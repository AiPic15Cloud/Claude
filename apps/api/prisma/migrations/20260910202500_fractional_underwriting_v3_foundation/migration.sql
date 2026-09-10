-- CreateEnum
CREATE TYPE "FractionalProjectStatus" AS ENUM ('ANALYSE', 'STRUCTURATION', 'VALIDATION_PLATEFORME', 'COLLECTE', 'ACQUISITION', 'EXPLOITATION', 'SORTIE', 'REFUSE', 'ABANDONNE');

-- CreateEnum
CREATE TYPE "FractionalAssumptionScenario" AS ENUM ('BASE', 'BEAR', 'SEVERE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FractionalIndexationType" AS ENUM ('ILC', 'ILAT', 'IRL', 'ICC', 'AUTRE');

-- CreateEnum
CREATE TYPE "FractionalLeaseRenewalStatus" AS ENUM ('SIGNE', 'EN_COURS', 'TACITE', 'DEPASSE', 'CONTESTE');

-- CreateEnum
CREATE TYPE "FractionalLeaseSecurityStatus" AS ENUM ('SECURED', 'WATCH', 'SECURE_BEFORE_ACQUISITION', 'EXCLUDE_FROM_SECURED_YIELD');

-- CreateEnum
CREATE TYPE "FractionalCapexResponsable" AS ENUM ('PROPRIETAIRE', 'LOCATAIRE');

-- CreateEnum
CREATE TYPE "FractionalValuationMethod" AS ENUM ('CAPITALISATION', 'DCF', 'COMPARABLE_SALES', 'COST_REPLACEMENT', 'EXTERNAL_APPRAISAL');

-- CreateEnum
CREATE TYPE "FractionalVehicleInstrumentType" AS ENUM ('OBLIGATION', 'ACTION', 'AUTRE');

-- CreateEnum
CREATE TYPE "RentIndexType" AS ENUM ('ILC', 'ILAT', 'IRL', 'ICC');

-- CreateEnum
CREATE TYPE "MarketComparableType" AS ENUM ('LOYER', 'VENTE');

-- CreateTable
CREATE TABLE "fractional_projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "FractionalProjectStatus" NOT NULL DEFAULT 'ANALYSE',
    "groupKey" TEXT,
    "perimeterLabel" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_assumption_sets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scenario" "FractionalAssumptionScenario" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "values" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_assumption_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_sources_uses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "prixNetVendeur" DECIMAL(14,2) NOT NULL,
    "droitsNotaire" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "honoraires" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "travauxInitiaux" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "capexDiffereReserve" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fraisPlateformeEntree" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reserveVacance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reserveTravaux" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reserveTresorerie" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "collecteMontant" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sponsorEquity" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "detteEventuelle" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "autresSources" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_sources_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_leases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "lotLabel" TEXT,
    "surfaceM2" DECIMAL(10,2),
    "dateEffet" TIMESTAMP(3) NOT NULL,
    "dateTerme" TIMESTAMP(3) NOT NULL,
    "breakDates" JSONB,
    "loyerFacialAnnuel" DECIMAL(14,2) NOT NULL,
    "ervAnnuel" DECIMAL(14,2),
    "indexation" "FractionalIndexationType" NOT NULL DEFAULT 'AUTRE',
    "indexationCapPct" DECIMAL(5,2),
    "indexationFloorPct" DECIMAL(5,2),
    "prochaineDateIndexation" TIMESTAMP(3),
    "franchiseMois" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "chargesRecuperables" BOOLEAN NOT NULL DEFAULT true,
    "depotGarantieMontant" DECIMAL(14,2),
    "statutRenouvellement" "FractionalLeaseRenewalStatus" NOT NULL DEFAULT 'SIGNE',
    "restrictionsCessionSousLocation" TEXT,
    "repartitionTravaux" TEXT,
    "impayesNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_capex_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "nature" TEXT NOT NULL,
    "responsable" "FractionalCapexResponsable" NOT NULL DEFAULT 'PROPRIETAIRE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_capex_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_valuations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "method" "FractionalValuationMethod" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "capRatePct" DECIMAL(5,2),
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_valuations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_fractional_profiles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "minNetInvestorYieldPct" DECIMAL(5,2) NOT NULL,
    "targetHoldPeriodMonths" INTEGER,
    "eligibleLocations" TEXT,
    "strategyConstraints" TEXT,
    "acquisitionFeePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "annualManagementFeePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "incomeShareInvestorPct" DECIMAL(5,2) NOT NULL,
    "capitalGainShareInvestorPct" DECIMAL(5,2) NOT NULL,
    "appraisalRule" TEXT,
    "earlyExitRule" TEXT,
    "source" TEXT,
    "confidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_fractional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_vehicle_structures" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platformProfileId" TEXT,
    "spvName" TEXT,
    "instrumentType" "FractionalVehicleInstrumentType" NOT NULL DEFAULT 'OBLIGATION',
    "nominal" DECIMAL(14,2),
    "maturity" TIMESTAMP(3),
    "amortization" TEXT,
    "governanceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_vehicle_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_index_series" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "indexType" "RentIndexType" NOT NULL,
    "period" TEXT NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "cagr5y" DECIMAL(6,3),
    "cagr10y" DECIMAL(6,3),
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_index_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_comparable_pool" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "secteur" TEXT,
    "type" "MarketComparableType" NOT NULL,
    "valeurM2" DECIMAL(10,2),
    "yieldPct" DECIMAL(5,2),
    "surfaceM2" DECIMAL(10,2),
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "addedByProjectId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_comparable_pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fractional_projects_reference_key" ON "fractional_projects"("reference");

-- CreateIndex
CREATE INDEX "fractional_projects_organizationId_idx" ON "fractional_projects"("organizationId");

-- CreateIndex
CREATE INDEX "fractional_projects_createdById_idx" ON "fractional_projects"("createdById");

-- CreateIndex
CREATE INDEX "fractional_projects_groupKey_idx" ON "fractional_projects"("groupKey");

-- CreateIndex
CREATE INDEX "fractional_assumption_sets_projectId_scenario_idx" ON "fractional_assumption_sets"("projectId", "scenario");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_sources_uses_projectId_key" ON "fractional_sources_uses"("projectId");

-- CreateIndex
CREATE INDEX "fractional_leases_projectId_idx" ON "fractional_leases"("projectId");

-- CreateIndex
CREATE INDEX "fractional_capex_items_projectId_idx" ON "fractional_capex_items"("projectId");

-- CreateIndex
CREATE INDEX "fractional_valuations_projectId_idx" ON "fractional_valuations"("projectId");

-- CreateIndex
CREATE INDEX "platform_fractional_profiles_organizationId_idx" ON "platform_fractional_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_vehicle_structures_projectId_key" ON "fractional_vehicle_structures"("projectId");

-- CreateIndex
CREATE INDEX "fractional_vehicle_structures_platformProfileId_idx" ON "fractional_vehicle_structures"("platformProfileId");

-- CreateIndex
CREATE INDEX "rent_index_series_organizationId_indexType_idx" ON "rent_index_series"("organizationId", "indexType");

-- CreateIndex
CREATE UNIQUE INDEX "rent_index_series_organizationId_indexType_period_key" ON "rent_index_series"("organizationId", "indexType", "period");

-- CreateIndex
CREATE INDEX "market_comparable_pool_organizationId_commune_idx" ON "market_comparable_pool"("organizationId", "commune");

-- AddForeignKey
ALTER TABLE "fractional_projects" ADD CONSTRAINT "fractional_projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_projects" ADD CONSTRAINT "fractional_projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_assumption_sets" ADD CONSTRAINT "fractional_assumption_sets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_sources_uses" ADD CONSTRAINT "fractional_sources_uses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_leases" ADD CONSTRAINT "fractional_leases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_capex_items" ADD CONSTRAINT "fractional_capex_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_valuations" ADD CONSTRAINT "fractional_valuations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fractional_profiles" ADD CONSTRAINT "platform_fractional_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_vehicle_structures" ADD CONSTRAINT "fractional_vehicle_structures_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_vehicle_structures" ADD CONSTRAINT "fractional_vehicle_structures_platformProfileId_fkey" FOREIGN KEY ("platformProfileId") REFERENCES "platform_fractional_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_index_series" ADD CONSTRAINT "rent_index_series_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_comparable_pool" ADD CONSTRAINT "market_comparable_pool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

