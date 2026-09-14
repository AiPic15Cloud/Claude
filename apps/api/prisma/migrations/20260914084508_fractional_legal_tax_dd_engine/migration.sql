-- CreateEnum
CREATE TYPE "FractionalLegalTaxItemStatusValue" AS ENUM ('NON_CONTROLE', 'CONFORME', 'RESERVE');

-- CreateTable
CREATE TABLE "fractional_legal_tax_item_statuses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" "FractionalLegalTaxItemStatusValue" NOT NULL,
    "notes" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fractional_legal_tax_item_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fractional_legal_tax_item_statuses_projectId_idx" ON "fractional_legal_tax_item_statuses"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "fractional_legal_tax_item_statuses_projectId_block_itemKey_key" ON "fractional_legal_tax_item_statuses"("projectId", "block", "itemKey");

-- AddForeignKey
ALTER TABLE "fractional_legal_tax_item_statuses" ADD CONSTRAINT "fractional_legal_tax_item_statuses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
