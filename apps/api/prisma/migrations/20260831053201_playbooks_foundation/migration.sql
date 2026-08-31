-- CreateEnum
CREATE TYPE "PlaybookEventType" AS ENUM ('PROCEDURE_COLLECTIVE_OUVERTE');

-- CreateTable
CREATE TABLE "playbook_instances" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "eventType" "PlaybookEventType" NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anchorDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbook_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_action_items" (
    "id" TEXT NOT NULL,
    "playbookInstanceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bloquant" BOOLEAN NOT NULL DEFAULT false,
    "requiresHumanValidation" BOOLEAN NOT NULL DEFAULT true,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playbook_action_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "playbook_instances_organizationId_idx" ON "playbook_instances"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "playbook_instances_dealId_eventType_key" ON "playbook_instances"("dealId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "playbook_action_items_taskId_key" ON "playbook_action_items"("taskId");

-- CreateIndex
CREATE INDEX "playbook_action_items_playbookInstanceId_idx" ON "playbook_action_items"("playbookInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "playbook_action_items_playbookInstanceId_key_key" ON "playbook_action_items"("playbookInstanceId", "key");

-- AddForeignKey
ALTER TABLE "playbook_instances" ADD CONSTRAINT "playbook_instances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_instances" ADD CONSTRAINT "playbook_instances_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_action_items" ADD CONSTRAINT "playbook_action_items_playbookInstanceId_fkey" FOREIGN KEY ("playbookInstanceId") REFERENCES "playbook_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_action_items" ADD CONSTRAINT "playbook_action_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

