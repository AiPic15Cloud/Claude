-- CreateEnum
CREATE TYPE "PrequalificationStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'VALIDATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PrequalificationOrientation" AS ENUM ('GO', 'GO_SOUS_CONDITIONS', 'WAIT', 'NO_GO_EN_L_ETAT');

-- CreateEnum
CREATE TYPE "PrequalificationConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PrequalificationProjectType" AS ENUM ('LAND_DIVISION', 'PROPERTY_TRADING_NO_WORKS', 'PROPERTY_TRADING_WITH_WORKS', 'BUILDING_DIVISION', 'RESIDENTIAL_DEVELOPMENT', 'COMMERCIAL_PROPERTY', 'REFINANCING', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('VERIFIED_OFFICIAL', 'VERIFIED_DOCUMENT', 'DECLARED_BY_OPERATOR', 'CALCULATED_BY_ATLAS', 'ANALYST_ASSESSMENT', 'MISSING', 'CONTRADICTORY');

-- CreateEnum
CREATE TYPE "PrequalPersonRole" AS ENUM ('PORTEUR_PRINCIPAL', 'ASSOCIE', 'DIRIGEANT', 'GARANT', 'AUTRE');

-- CreateEnum
CREATE TYPE "PrequalCompanyState" AS ENUM ('EXISTANTE', 'A_CREER', 'RADIEE', 'INCONNUE');

-- CreateEnum
CREATE TYPE "PrequalCompanyRole" AS ENUM ('OPERATEUR', 'SOCIETE_PROJET', 'HOLDING', 'GARANTE', 'ENTREPRISE_TRAVAUX', 'AUTRE');

-- CreateEnum
CREATE TYPE "PrequalAcquisitionStatus" AS ENUM ('OFFRE', 'PROMESSE', 'ACTE', 'PROPRIETE');

-- CreateEnum
CREATE TYPE "PrequalLotStatus" AS ENUM ('NOT_MARKETED', 'MARKETED', 'INTEREST', 'OFFER', 'RESERVATION', 'PROMISE', 'DEED');

-- CreateEnum
CREATE TYPE "FindingCategory" AS ENUM ('OPERATOR', 'COMPANY', 'FINANCIAL', 'MARKET', 'PLANNING', 'COMMERCIALISATION', 'WORKS', 'LEGAL', 'EXPOSURE');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('INFO', 'POSITIVE', 'WATCH', 'MATERIAL', 'BLOCKING');

-- CreateEnum
CREATE TYPE "FindingGeneratedBy" AS ENUM ('RULE', 'MODEL', 'ANALYST');

-- CreateEnum
CREATE TYPE "FindingReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'AMENDED');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'PREQUALIFICATION_PROMOTED';

-- CreateTable
CREATE TABLE "prequalification_cases" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PrequalificationStatus" NOT NULL DEFAULT 'DRAFT',
    "orientation" "PrequalificationOrientation",
    "confidence" "PrequalificationConfidence",
    "projectType" "PrequalificationProjectType",
    "version" INTEGER NOT NULL DEFAULT 1,
    "entryChannel" TEXT,
    "introducer" TEXT,
    "assignedAnalystId" TEXT NOT NULL,
    "summary" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "promotedDealId" TEXT,
    "promotedVersionNumber" INTEGER,

    CONSTRAINT "prequalification_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_versions" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "orientation" "PrequalificationOrientation" NOT NULL,
    "decisionComment" TEXT NOT NULL,
    "validatedById" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prequalification_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_evidence" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "status" "EvidenceStatus" NOT NULL,
    "sourceDocumentId" TEXT,
    "sourcePage" INTEGER,
    "sourceUrl" TEXT,
    "confidence" INTEGER,
    "note" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prequalification_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_people" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "PrequalPersonRole" NOT NULL,
    "cv" TEXT,
    "trackRecord" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "declaredNetWorth" DECIMAL(14,2),
    "availableEquity" DECIMAL(14,2),
    "equityProofNote" TEXT,
    "ongoingDealsNote" TEXT,
    "incidentsNote" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prequalification_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_companies" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "siren" TEXT,
    "legalForm" TEXT,
    "state" "PrequalCompanyState" NOT NULL DEFAULT 'INCONNUE',
    "role" "PrequalCompanyRole" NOT NULL,
    "executives" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "accountsAvailable" BOOLEAN NOT NULL DEFAULT false,
    "knownDebtNote" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prequalification_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_project_profiles" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "address" TEXT,
    "cadastralRef" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "description" TEXT,
    "existingSurfaceSqm" DECIMAL(10,2),
    "createdSurfaceSqm" DECIMAL(10,2),
    "soldSurfaceSqm" DECIMAL(10,2),
    "lotCount" INTEGER,
    "lotType" TEXT,
    "acquisitionStatus" "PrequalAcquisitionStatus",
    "conditionsPrecedent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acquisitionPrice" DECIMAL(14,2),
    "worksDescription" TEXT,
    "exitStrategy" TEXT,
    "interimRevenueNote" TEXT,
    "targetTimeline" TEXT,
    "criticalDependencies" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prequalification_project_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_financial_models" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "amountRequested" DECIMAL(14,2),
    "declaredEquity" DECIMAL(14,2),
    "provenEquity" DECIMAL(14,2),
    "declaredMarginPct" DECIMAL(6,3),
    "declaredCoutDeRevient" DECIMAL(14,2),
    "declaredChiffreAffaires" DECIMAL(14,2),
    "landPrice" DECIMAL(14,2),
    "bankDebt" DECIMAL(14,2),
    "coutDeRevient" DECIMAL(14,2),
    "chiffreAffaires" DECIMAL(14,2),
    "margeRecalculee" DECIMAL(14,2),
    "margeRecalculeePct" DECIMAL(6,3),
    "besoinMaxFinancement" DECIMAL(14,2),
    "prixSortiePondere" DECIMAL(14,2),
    "pointMortAuM2" DECIMAL(14,2),
    "ltaPct" DECIMAL(6,3),
    "ltcPct" DECIMAL(6,3),
    "ltvPct" DECIMAL(6,3),
    "ratiosIncludeBankDebt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prequalification_financial_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_cost_line_items" (
    "id" TEXT NOT NULL,
    "prequalFinancialModelId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prequalification_cost_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_sales_lots" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "assetType" TEXT,
    "surfaceSqm" DECIMAL(10,2),
    "askingPrice" DECIMAL(14,2),
    "expectedPrice" DECIMAL(14,2),
    "status" "PrequalLotStatus" NOT NULL DEFAULT 'NOT_MARKETED',
    "conditionsPrecedent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buyerFinancingStatus" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prequalification_sales_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_timeline_assessments" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "businessUrgencyNote" TEXT,
    "realisticTimeline" TEXT,
    "dependencies" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prequalification_timeline_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_documents" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL DEFAULT 'local',
    "classification" TEXT,
    "pageCount" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prequalification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_findings" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "category" "FindingCategory" NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "statement" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ruleId" TEXT,
    "generatedBy" "FindingGeneratedBy" NOT NULL,
    "reviewStatus" "FindingReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prequalification_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_decisive_questions" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "affectedFindingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answerCouldChangeOrientation" BOOLEAN NOT NULL,
    "priority" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prequalification_decisive_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prequalification_document_requests" (
    "id" TEXT NOT NULL,
    "prequalificationCaseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "linkedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prequalification_document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_milestones" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "blocking" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceFindingId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prequalification_cases_promotedDealId_key" ON "prequalification_cases"("promotedDealId");

-- CreateIndex
CREATE INDEX "prequalification_cases_organizationId_status_idx" ON "prequalification_cases"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "prequalification_versions_prequalificationCaseId_versionNum_key" ON "prequalification_versions"("prequalificationCaseId", "versionNumber");

-- CreateIndex
CREATE INDEX "prequalification_evidence_prequalificationCaseId_idx" ON "prequalification_evidence"("prequalificationCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "prequalification_evidence_prequalificationCaseId_entityType_key" ON "prequalification_evidence"("prequalificationCaseId", "entityType", "entityId", "fieldKey");

-- CreateIndex
CREATE INDEX "prequalification_people_prequalificationCaseId_idx" ON "prequalification_people"("prequalificationCaseId");

-- CreateIndex
CREATE INDEX "prequalification_companies_prequalificationCaseId_idx" ON "prequalification_companies"("prequalificationCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "prequalification_project_profiles_prequalificationCaseId_key" ON "prequalification_project_profiles"("prequalificationCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "prequalification_financial_models_prequalificationCaseId_key" ON "prequalification_financial_models"("prequalificationCaseId");

-- CreateIndex
CREATE INDEX "prequalification_cost_line_items_prequalFinancialModelId_idx" ON "prequalification_cost_line_items"("prequalFinancialModelId");

-- CreateIndex
CREATE INDEX "prequalification_sales_lots_prequalificationCaseId_idx" ON "prequalification_sales_lots"("prequalificationCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "prequalification_timeline_assessments_prequalificationCaseI_key" ON "prequalification_timeline_assessments"("prequalificationCaseId");

-- CreateIndex
CREATE INDEX "prequalification_documents_prequalificationCaseId_idx" ON "prequalification_documents"("prequalificationCaseId");

-- CreateIndex
CREATE INDEX "prequalification_findings_prequalificationCaseId_severity_idx" ON "prequalification_findings"("prequalificationCaseId", "severity");

-- CreateIndex
CREATE INDEX "prequalification_decisive_questions_prequalificationCaseId_idx" ON "prequalification_decisive_questions"("prequalificationCaseId");

-- CreateIndex
CREATE INDEX "prequalification_document_requests_prequalificationCaseId_idx" ON "prequalification_document_requests"("prequalificationCaseId");

-- CreateIndex
CREATE INDEX "portfolio_milestones_dealId_idx" ON "portfolio_milestones"("dealId");

-- AddForeignKey
ALTER TABLE "prequalification_cases" ADD CONSTRAINT "prequalification_cases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_cases" ADD CONSTRAINT "prequalification_cases_assignedAnalystId_fkey" FOREIGN KEY ("assignedAnalystId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_cases" ADD CONSTRAINT "prequalification_cases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_cases" ADD CONSTRAINT "prequalification_cases_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_cases" ADD CONSTRAINT "prequalification_cases_promotedDealId_fkey" FOREIGN KEY ("promotedDealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_versions" ADD CONSTRAINT "prequalification_versions_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_versions" ADD CONSTRAINT "prequalification_versions_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_evidence" ADD CONSTRAINT "prequalification_evidence_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_evidence" ADD CONSTRAINT "prequalification_evidence_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "prequalification_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_evidence" ADD CONSTRAINT "prequalification_evidence_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_people" ADD CONSTRAINT "prequalification_people_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_people" ADD CONSTRAINT "prequalification_people_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_companies" ADD CONSTRAINT "prequalification_companies_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_companies" ADD CONSTRAINT "prequalification_companies_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_project_profiles" ADD CONSTRAINT "prequalification_project_profiles_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_financial_models" ADD CONSTRAINT "prequalification_financial_models_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_cost_line_items" ADD CONSTRAINT "prequalification_cost_line_items_prequalFinancialModelId_fkey" FOREIGN KEY ("prequalFinancialModelId") REFERENCES "prequalification_financial_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_sales_lots" ADD CONSTRAINT "prequalification_sales_lots_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_timeline_assessments" ADD CONSTRAINT "prequalification_timeline_assessments_prequalificationCase_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_documents" ADD CONSTRAINT "prequalification_documents_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_documents" ADD CONSTRAINT "prequalification_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_findings" ADD CONSTRAINT "prequalification_findings_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_findings" ADD CONSTRAINT "prequalification_findings_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_decisive_questions" ADD CONSTRAINT "prequalification_decisive_questions_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_document_requests" ADD CONSTRAINT "prequalification_document_requests_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prequalification_document_requests" ADD CONSTRAINT "prequalification_document_requests_linkedDocumentId_fkey" FOREIGN KEY ("linkedDocumentId") REFERENCES "prequalification_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_milestones" ADD CONSTRAINT "portfolio_milestones_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
