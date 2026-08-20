-- AlterTable
ALTER TABLE "financial_assumptions" ADD COLUMN     "baselineLockedAt" TIMESTAMP(3),
ADD COLUMN     "baselineLockedById" TEXT,
ADD COLUMN     "baselineSnapshot" JSONB;

-- AlterTable
ALTER TABLE "sale_lots" ALTER COLUMN "status" SET DEFAULT 'EN_VENTE';

-- AddForeignKey
ALTER TABLE "financial_assumptions" ADD CONSTRAINT "financial_assumptions_baselineLockedById_fkey" FOREIGN KEY ("baselineLockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
