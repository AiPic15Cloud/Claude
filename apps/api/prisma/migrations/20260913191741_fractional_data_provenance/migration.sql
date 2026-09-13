-- CreateEnum
CREATE TYPE "FractionalProvenanceSourceLevel" AS ENUM ('LEVEL_A_LEGAL_EXECUTED', 'LEVEL_B_THIRD_PARTY_VERIFIED', 'LEVEL_C_INVESTMENT_OPERATOR_DOCUMENT', 'LEVEL_D_DECLARATIVE', 'LEVEL_E_ATLAS_ASSUMPTION');

-- CreateEnum
CREATE TYPE "FractionalProvenanceVerificationStatus" AS ENUM ('UNVERIFIED', 'CROSS_CHECKED', 'VERIFIED', 'CONFLICTING');

-- CreateEnum
CREATE TYPE "FractionalProvenanceConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "fractional_data_provenance" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "sourceLevel" "FractionalProvenanceSourceLevel" NOT NULL,
    "sourceReference" TEXT,
    "asOfDate" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "FractionalProvenanceVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "confidence" "FractionalProvenanceConfidence" NOT NULL,
    "ownerId" TEXT,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideJustification" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractional_data_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_data_provenance_projectId_idx" ON "fractional_data_provenance"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_data_provenance_entityType_entityId_fieldKey_key" ON "fractional_data_provenance"("entityType", "entityId", "fieldKey");

-- AddForeignKey
ALTER TABLE "fractional_data_provenance" ADD CONSTRAINT "fractional_data_provenance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
