-- AlterTable
ALTER TABLE "pipeline_entries" ADD COLUMN     "convertedDealId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_entries_convertedDealId_key" ON "pipeline_entries"("convertedDealId");

-- AddForeignKey
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_convertedDealId_fkey" FOREIGN KEY ("convertedDealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
