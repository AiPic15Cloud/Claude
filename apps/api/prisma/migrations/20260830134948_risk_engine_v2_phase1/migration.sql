-- AlterEnum (rename in place — metadata-only, reclassifies every existing
-- row automatically, no data touched, no UPDATE statement needed)
ALTER TYPE "DealRecoveryStatus" RENAME VALUE 'SAIN' TO 'RAS';
ALTER TYPE "DealRecoveryStatus" RENAME VALUE 'EN_RETARD' TO 'AMIABLE';
ALTER TYPE "DealRecoveryStatus" RENAME VALUE 'PRE_CONTENTIEUX' TO 'MISE_EN_DEMEURE';
ALTER TYPE "DealRecoveryStatus" RENAME VALUE 'PROCEDURE' TO 'PROCEDURE_COLLECTIVE';
ALTER TYPE "DealRecoveryStatus" ADD VALUE 'CONTENTIEUX' AFTER 'MISE_EN_DEMEURE';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'RISK_OVERRIDE_TRIGGERED';
ALTER TYPE "ActivityType" ADD VALUE 'ANALYST_OVERRIDE_SET';

-- CreateEnum
CREATE TYPE "DealSurveillanceStatus" AS ENUM ('OUTPERFORMING', 'PERFORMING', 'WATCH', 'DRIFTING', 'DISTRESSED', 'RECOVERY');

-- AlterTable
ALTER TABLE "deals" ALTER COLUMN "recoveryStatus" SET DEFAULT 'RAS';
ALTER TABLE "deals" ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "performanceScore" INTEGER,
ADD COLUMN     "ewsScore" INTEGER,
ADD COLUMN     "surveillanceStatus" "DealSurveillanceStatus",
ADD COLUMN     "recoveryWatchUntil" TIMESTAMP(3),
ADD COLUMN     "chantierSignaleArret" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chantierSignaleArretAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "risk_score_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "performanceScore" INTEGER NOT NULL,
    "ewsScore" INTEGER NOT NULL,
    "compositeScore" INTEGER NOT NULL,
    "surveillanceStatus" "DealSurveillanceStatus" NOT NULL,
    "breakdown" JSONB NOT NULL,
    "trigger" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_overrides" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minimumSurveillanceStatus" "DealSurveillanceStatus" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "risk_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_overrides" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "automaticStatus" "DealSurveillanceStatus" NOT NULL,
    "overrideStatus" "DealSurveillanceStatus" NOT NULL,
    "justification" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clearedAt" TIMESTAMP(3),
    "clearedById" TEXT,

    CONSTRAINT "deal_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risk_score_snapshots_dealId_computedAt_idx" ON "risk_score_snapshots"("dealId", "computedAt");

-- CreateIndex
CREATE INDEX "risk_score_snapshots_organizationId_idx" ON "risk_score_snapshots"("organizationId");

-- CreateIndex
CREATE INDEX "risk_overrides_dealId_active_idx" ON "risk_overrides"("dealId", "active");

-- CreateIndex
CREATE INDEX "risk_overrides_organizationId_idx" ON "risk_overrides"("organizationId");

-- CreateIndex
CREATE INDEX "deal_overrides_dealId_active_idx" ON "deal_overrides"("dealId", "active");

-- CreateIndex
CREATE INDEX "deal_overrides_organizationId_idx" ON "deal_overrides"("organizationId");

-- AddForeignKey
ALTER TABLE "risk_score_snapshots" ADD CONSTRAINT "risk_score_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_score_snapshots" ADD CONSTRAINT "risk_score_snapshots_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_overrides" ADD CONSTRAINT "risk_overrides_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_overrides" ADD CONSTRAINT "risk_overrides_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_overrides" ADD CONSTRAINT "deal_overrides_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_overrides" ADD CONSTRAINT "deal_overrides_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_overrides" ADD CONSTRAINT "deal_overrides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_overrides" ADD CONSTRAINT "deal_overrides_clearedById_fkey" FOREIGN KEY ("clearedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
