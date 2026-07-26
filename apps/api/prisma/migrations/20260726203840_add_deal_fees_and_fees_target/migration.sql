-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "feesAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "feesRate" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "fees_targets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fees_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fees_targets_organizationId_year_key" ON "fees_targets"("organizationId", "year");

-- AddForeignKey
ALTER TABLE "fees_targets" ADD CONSTRAINT "fees_targets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
