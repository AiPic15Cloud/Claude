-- CreateEnum
CREATE TYPE "FractionalScoreComparisonOperator" AS ENUM ('GTE', 'LTE', 'GT', 'LT', 'EQ');

-- CreateEnum
CREATE TYPE "FractionalScoreVerdict" AS ENUM ('NO_GO', 'CONDITIONNEL', 'GO', 'GO_FORT');

-- AlterTable
ALTER TABLE "fractional_projects" ADD COLUMN     "assetType" TEXT;

-- CreateTable
CREATE TABLE "fractional_score_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetType" TEXT,
    "label" TEXT NOT NULL,
    "maxPoints" DECIMAL(6,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_score_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_score_criteria" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sourceField" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_score_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_score_buckets" (
    "id" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" DECIMAL(6,2) NOT NULL,
    "isEliminatory" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_score_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_eliminatory_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetType" TEXT,
    "platformProfileId" TEXT,
    "label" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "operator" "FractionalScoreComparisonOperator" NOT NULL,
    "threshold" DECIMAL(12,4) NOT NULL,
    "failMessage" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_eliminatory_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_score_assessments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scoredById" TEXT,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPoints" DECIMAL(6,2) NOT NULL,
    "maxPoints" DECIMAL(6,2) NOT NULL,
    "categoryBreakdown" JSONB NOT NULL,
    "eliminatoryResults" JSONB NOT NULL,
    "finalVerdict" "FractionalScoreVerdict" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_score_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractional_score_answers" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,

    CONSTRAINT "fractional_score_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_score_categories_organizationId_assetType_idx" ON "fractional_score_categories"("organizationId", "assetType");

-- CreateIndex
CREATE INDEX "fractional_score_criteria_categoryId_idx" ON "fractional_score_criteria"("categoryId");

-- CreateIndex
CREATE INDEX "fractional_score_buckets_criterionId_idx" ON "fractional_score_buckets"("criterionId");

-- CreateIndex
CREATE INDEX "fractional_eliminatory_rules_organizationId_assetType_idx" ON "fractional_eliminatory_rules"("organizationId", "assetType");

-- CreateIndex
CREATE INDEX "fractional_eliminatory_rules_platformProfileId_idx" ON "fractional_eliminatory_rules"("platformProfileId");

-- CreateIndex
CREATE INDEX "fractional_score_assessments_projectId_idx" ON "fractional_score_assessments"("projectId");

-- CreateIndex
CREATE INDEX "fractional_score_answers_assessmentId_idx" ON "fractional_score_answers"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_score_answers_assessmentId_criterionId_key" ON "fractional_score_answers"("assessmentId", "criterionId");

-- AddForeignKey
ALTER TABLE "fractional_score_categories" ADD CONSTRAINT "fractional_score_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_score_criteria" ADD CONSTRAINT "fractional_score_criteria_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fractional_score_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_score_buckets" ADD CONSTRAINT "fractional_score_buckets_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "fractional_score_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_eliminatory_rules" ADD CONSTRAINT "fractional_eliminatory_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_eliminatory_rules" ADD CONSTRAINT "fractional_eliminatory_rules_platformProfileId_fkey" FOREIGN KEY ("platformProfileId") REFERENCES "platform_fractional_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_score_assessments" ADD CONSTRAINT "fractional_score_assessments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_score_answers" ADD CONSTRAINT "fractional_score_answers_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "fractional_score_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_score_answers" ADD CONSTRAINT "fractional_score_answers_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "fractional_score_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractional_score_answers" ADD CONSTRAINT "fractional_score_answers_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "fractional_score_buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
