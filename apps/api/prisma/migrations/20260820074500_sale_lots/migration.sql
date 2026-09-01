-- CreateTable
CREATE TABLE "sale_lots" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "surfaceSqm" DECIMAL(10,2) NOT NULL,
    "salePrice" DECIMAL(14,2) NOT NULL,
    "sold" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sale_lots_dealId_idx" ON "sale_lots"("dealId");

-- AddForeignKey
ALTER TABLE "sale_lots" ADD CONSTRAINT "sale_lots_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
