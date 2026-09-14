-- CreateEnum
CREATE TYPE "FractionalTechnicalSubBlock" AS ENUM ('BATIMENT', 'CONFORMITE', 'ETAT', 'ADAPTABILITE', 'OBSOLESCENCE', 'ENVIRONNEMENT', 'ASSURANCE');

-- CreateEnum
CREATE TYPE "FractionalTechnicalTier" AS ENUM ('BON', 'MOYEN', 'MAUVAIS', 'CRITIQUE');

-- CreateTable
CREATE TABLE "fractional_technical_assessments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subBlock" "FractionalTechnicalSubBlock" NOT NULL,
    "tier" "FractionalTechnicalTier" NOT NULL,
    "conditionPrealable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_technical_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_technical_assessments_projectId_idx" ON "fractional_technical_assessments"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_technical_assessments_projectId_subBlock_key" ON "fractional_technical_assessments"("projectId", "subBlock");

-- AddForeignKey
ALTER TABLE "fractional_technical_assessments" ADD CONSTRAINT "fractional_technical_assessments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
