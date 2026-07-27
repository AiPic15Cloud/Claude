-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "contentieux" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repaid" BOOLEAN NOT NULL DEFAULT false;
