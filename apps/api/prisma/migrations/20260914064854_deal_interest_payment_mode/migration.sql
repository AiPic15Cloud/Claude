-- CreateEnum
CREATE TYPE "DealRepaymentMode" AS ENUM ('MENSUEL', 'IN_FINE');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "interestPaymentDay" INTEGER,
ADD COLUMN     "repaymentMode" "DealRepaymentMode";

-- CreateTable
CREATE TABLE "interest_payments" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "paidDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2),
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interest_payments_dealId_idx" ON "interest_payments"("dealId");

-- AddForeignKey
ALTER TABLE "interest_payments" ADD CONSTRAINT "interest_payments_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_payments" ADD CONSTRAINT "interest_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
