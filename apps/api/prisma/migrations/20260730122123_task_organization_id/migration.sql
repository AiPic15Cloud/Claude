-- AlterTable: add nullable first so existing rows can be backfilled
ALTER TABLE "tasks" ADD COLUMN     "organizationId" TEXT;

-- Backfill from the task's own deal, when it has one
UPDATE "tasks" t
SET "organizationId" = d."organizationId"
FROM "deals" d
WHERE t."dealId" = d."id" AND t."organizationId" IS NULL;

-- Backfill deal-less tasks from the assignee's organization
UPDATE "tasks" t
SET "organizationId" = u."organizationId"
FROM "users" u
WHERE t."assigneeId" = u."id" AND t."organizationId" IS NULL;

-- Enforce NOT NULL now that every row has a value
ALTER TABLE "tasks" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tasks_organizationId_idx" ON "tasks"("organizationId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
