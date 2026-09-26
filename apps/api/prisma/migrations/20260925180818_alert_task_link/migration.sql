-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "alerts_taskId_idx" ON "alerts"("taskId");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
