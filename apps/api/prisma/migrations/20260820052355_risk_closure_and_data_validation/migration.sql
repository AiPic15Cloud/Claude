-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "riskScoreAtClosure" INTEGER,
ADD COLUMN     "riskScoreAtClosureDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "data_validations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "validatedById" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_validations_dealId_entityType_key" ON "data_validations"("dealId", "entityType");

-- AddForeignKey
ALTER TABLE "data_validations" ADD CONSTRAINT "data_validations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_validations" ADD CONSTRAINT "data_validations_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_validations" ADD CONSTRAINT "data_validations_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
