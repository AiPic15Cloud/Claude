-- CreateTable
CREATE TABLE "deal_document_requests" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "block" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "linkedDocumentId" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_document_requests_dealId_idx" ON "deal_document_requests"("dealId");

-- AddForeignKey
ALTER TABLE "deal_document_requests" ADD CONSTRAINT "deal_document_requests_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_document_requests" ADD CONSTRAINT "deal_document_requests_linkedDocumentId_fkey" FOREIGN KEY ("linkedDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_document_requests" ADD CONSTRAINT "deal_document_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

