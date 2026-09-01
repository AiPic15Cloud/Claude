-- CreateEnum
CREATE TYPE "CommitteeStatus" AS ENUM ('PAS_DE_COMITE', 'VALIDE', 'CONDITIONS_SUSPENSIVES', 'REFUSE');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "lastNewsletterDate" TIMESTAMP(3),
ADD COLUMN     "newsletterTargetDays" INTEGER NOT NULL DEFAULT 45;

-- CreateTable
CREATE TABLE "pipeline_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "typology" TEXT,
    "source" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "margin" DECIMAL(5,2),
    "committee" "CommitteeStatus" NOT NULL DEFAULT 'PAS_DE_COMITE',
    "decision" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_entries_organizationId_idx" ON "pipeline_entries"("organizationId");

-- CreateIndex
CREATE INDEX "pipeline_entries_committee_idx" ON "pipeline_entries"("committee");

-- AddForeignKey
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
