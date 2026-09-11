-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "fractionalProjectId" TEXT;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_fractionalProjectId_fkey" FOREIGN KEY ("fractionalProjectId") REFERENCES "fractional_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
