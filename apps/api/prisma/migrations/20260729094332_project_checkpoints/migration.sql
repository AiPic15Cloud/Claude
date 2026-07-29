-- CreateTable
CREATE TABLE "project_checkpoints" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "travauxBudgetInitial" DECIMAL(14,2),
    "travauxDepensesADate" DECIMAL(14,2),
    "travauxTermines" BOOLEAN NOT NULL DEFAULT false,
    "commercialisationLancee" BOOLEAN NOT NULL DEFAULT false,
    "pourcentageVendu" INTEGER,
    "prixVenteInitialPrevu" DECIMAL(14,2),
    "prixVenteReelADate" DECIMAL(14,2),
    "atterrissagePrevu" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_checkpoints_dealId_idx" ON "project_checkpoints"("dealId");

-- AddForeignKey
ALTER TABLE "project_checkpoints" ADD CONSTRAINT "project_checkpoints_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_checkpoints" ADD CONSTRAINT "project_checkpoints_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
