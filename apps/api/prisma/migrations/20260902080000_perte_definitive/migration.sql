-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "perteDefinitiveActee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "perteDefinitiveDate" TIMESTAMP(3),
ADD COLUMN     "perteDefinitiveNote" TEXT;


