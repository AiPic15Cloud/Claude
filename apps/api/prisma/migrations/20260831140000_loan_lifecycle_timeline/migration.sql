-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "dateEcheanceInitiale" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "loan_extensions" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dateSignature" TIMESTAMP(3) NOT NULL,
    "nouvelleDateEcheance" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loan_extensions_dealId_idx" ON "loan_extensions"("dealId");

-- AddForeignKey
ALTER TABLE "loan_extensions" ADD CONSTRAINT "loan_extensions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_extensions" ADD CONSTRAINT "loan_extensions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

