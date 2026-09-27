-- AlterTable
ALTER TABLE "pipeline_entries" ADD COLUMN     "prequalificationCaseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_entries_prequalificationCaseId_key" ON "pipeline_entries"("prequalificationCaseId");

-- AddForeignKey
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_prequalificationCaseId_fkey" FOREIGN KEY ("prequalificationCaseId") REFERENCES "prequalification_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

