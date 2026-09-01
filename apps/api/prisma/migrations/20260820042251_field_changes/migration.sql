-- CreateTable
CREATE TABLE "field_changes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedById" TEXT,
    "sourceDocumentId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_changes_organizationId_idx" ON "field_changes"("organizationId");

-- CreateIndex
CREATE INDEX "field_changes_dealId_entityType_idx" ON "field_changes"("dealId", "entityType");

-- AddForeignKey
ALTER TABLE "field_changes" ADD CONSTRAINT "field_changes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_changes" ADD CONSTRAINT "field_changes_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_changes" ADD CONSTRAINT "field_changes_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_changes" ADD CONSTRAINT "field_changes_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
