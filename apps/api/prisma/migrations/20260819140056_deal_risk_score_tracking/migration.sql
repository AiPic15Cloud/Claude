-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "riskScorePrevious" INTEGER,
ADD COLUMN     "riskScoreUpdatedAt" TIMESTAMP(3),
ALTER COLUMN "riskScore" DROP DEFAULT;
