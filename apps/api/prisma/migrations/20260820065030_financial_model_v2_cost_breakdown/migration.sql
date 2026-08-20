-- AlterTable
ALTER TABLE "financial_assumptions" DROP COLUMN "constructionCostPerSqm",
DROP COLUMN "otherCosts",
ADD COLUMN     "agencyFees" DECIMAL(14,2),
ADD COLUMN     "bankFileFees" DECIMAL(14,2),
ADD COLUMN     "bankGuaranteeFees" DECIMAL(14,2),
ADD COLUMN     "bankInterestRatePct" DECIMAL(5,2),
ADD COLUMN     "bankLoanAccompagnement" DECIMAL(14,2),
ADD COLUMN     "bankLoanAcquisition" DECIMAL(14,2),
ADD COLUMN     "bankMiscFees" DECIMAL(14,2),
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "diagnosticsCost" DECIMAL(14,2),
ADD COLUMN     "insuranceCost" DECIMAL(14,2),
ADD COLUMN     "landPrice" DECIMAL(14,2),
ADD COLUMN     "lpbDurationMaxMonths" INTEGER,
ADD COLUMN     "lpbDurationMinMonths" INTEGER,
ADD COLUMN     "lpbFeesPctHT" DECIMAL(5,2),
ADD COLUMN     "lpbTvaApplicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lpbTvaRatePct" DECIMAL(5,2),
ADD COLUMN     "notaryFees" DECIMAL(14,2),
ADD COLUMN     "propertyTaxCost" DECIMAL(14,2),
ADD COLUMN     "surveyStudiesCost" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "cost_line_items" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cost_line_items_dealId_category_idx" ON "cost_line_items"("dealId", "category");

-- AddForeignKey
ALTER TABLE "cost_line_items" ADD CONSTRAINT "cost_line_items_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

