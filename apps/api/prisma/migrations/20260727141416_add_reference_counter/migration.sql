-- CreateTable
CREATE TABLE "reference_counters" (
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "reference_counters_pkey" PRIMARY KEY ("organizationId","year")
);
