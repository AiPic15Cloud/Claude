-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE', 'WAIVED');

-- AlterTable
-- Le générateur proposait DROP COLUMN "status" / ADD COLUMN "status" ... (perte
-- de données) — remplacé par un cast explicite : en production, ce modèle n'a
-- jamais eu d'autre valeur que 'PENDING' (aucun code applicatif ne le modifie
-- avant cette migration, voir field-changes/promotion.service.ts), donc le
-- cast texte->enum réussit toujours ici, mais le faire proprement plutôt que
-- de compter dessus reste la bonne pratique déjà suivie dans ce dépôt.
ALTER TABLE "portfolio_milestones" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "targetDate" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "portfolio_milestones" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "portfolio_milestones" ALTER COLUMN "status" TYPE "MilestoneStatus" USING ("status"::text::"MilestoneStatus");
ALTER TABLE "portfolio_milestones" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "estimatedHours" DECIMAL(6,2),
ADD COLUMN     "milestoneId" TEXT;

-- CreateIndex
CREATE INDEX "portfolio_milestones_organizationId_idx" ON "portfolio_milestones"("organizationId");

-- CreateIndex
CREATE INDEX "tasks_milestoneId_idx" ON "tasks"("milestoneId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "portfolio_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_milestones" ADD CONSTRAINT "portfolio_milestones_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_milestones" ADD CONSTRAINT "portfolio_milestones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
