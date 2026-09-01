-- CreateEnum
CREATE TYPE "CompetitorProjectStatus" AS ENUM ('A_VENIR', 'EN_COLLECTE', 'CLOTURE');

-- CreateTable
CREATE TABLE "competitor_projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CompetitorProjectStatus" NOT NULL DEFAULT 'EN_COLLECTE',
    "targetAmount" DECIMAL(14,2),
    "expectedDate" TIMESTAMP(3),
    "url" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competitor_projects_organizationId_idx" ON "competitor_projects"("organizationId");

-- CreateIndex
CREATE INDEX "competitor_projects_entityId_idx" ON "competitor_projects"("entityId");

-- AddForeignKey
ALTER TABLE "competitor_projects" ADD CONSTRAINT "competitor_projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_projects" ADD CONSTRAINT "competitor_projects_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_projects" ADD CONSTRAINT "competitor_projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
