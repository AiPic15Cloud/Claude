-- CreateEnum
CREATE TYPE "FractionalDpeClass" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G');

-- CreateEnum
CREATE TYPE "FractionalEsgEquipmentTier" AS ENUM ('NEUF', 'BON', 'VETUSTE', 'OBSOLETE');

-- CreateEnum
CREATE TYPE "FractionalEsgPhysicalRiskTier" AS ENUM ('FAIBLE', 'MODERE', 'ELEVE');

-- CreateTable
CREATE TABLE "fractional_esg_assessments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dpeClass" "FractionalDpeClass",
    "consumptionKwhM2An" DECIMAL(8,2),
    "decreeTertiaireSubject" BOOLEAN NOT NULL DEFAULT false,
    "equipmentConditionTier" "FractionalEsgEquipmentTier",
    "physicalRiskExposure" "FractionalEsgPhysicalRiskTier",
    "greenLeaseClauses" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_esg_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fractional_esg_assessments_projectId_key" ON "fractional_esg_assessments"("projectId");

-- AddForeignKey
ALTER TABLE "fractional_esg_assessments" ADD CONSTRAINT "fractional_esg_assessments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
