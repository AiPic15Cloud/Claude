-- CreateEnum
CREATE TYPE "GuaranteeType" AS ENUM ('HYPOTHEQUE', 'CAUTION', 'GAGE', 'NANTISSEMENT', 'PRIVILEGE', 'AUTRE');

-- CreateEnum
CREATE TYPE "GuaranteeStatus" AS ENUM ('ACTIVE', 'RELEASED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "GraphEntityType" AS ENUM ('PROMOTEUR', 'BANQUE', 'NOTAIRE', 'ARCHITECTE', 'COLLECTIVITE', 'INVESTISSEUR', 'PLATEFORME');

-- CreateEnum
CREATE TYPE "DealEntityRole" AS ENUM ('PROMOTEUR', 'BANQUE_FINANCEUR', 'NOTAIRE', 'ARCHITECTE', 'COLLECTIVITE', 'INVESTISSEUR', 'GARANT', 'AUTRE');

-- CreateEnum
CREATE TYPE "GraphRelationType" AS ENUM ('PARTENAIRE', 'FINANCEUR', 'CONSEIL', 'CONCURRENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('TAUX', 'INFLATION', 'CONSTRUCTION', 'IMMOBILIER', 'LOGISTIQUE', 'COMMERCE', 'RESIDENTIEL', 'REGLEMENTATION', 'CONCURRENCE', 'AUTRE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'GUARANTEE_ADDED';
ALTER TYPE "ActivityType" ADD VALUE 'FINANCIAL_MODEL_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'ENTITY_LINKED';

-- CreateTable
CREATE TABLE "guarantees" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "GuaranteeType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "status" "GuaranteeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guarantees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_assumptions" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "surfaceSqm" DECIMAL(10,2) NOT NULL,
    "constructionCostPerSqm" DECIMAL(10,2) NOT NULL,
    "sellingPricePerSqm" DECIMAL(10,2) NOT NULL,
    "otherCosts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "targetMarginPct" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_assumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graph_entities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "GraphEntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "city" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "graph_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_entity_links" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" "DealEntityRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_entity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graph_relations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "type" "GraphRelationType" NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graph_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_sources" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT,
    "category" "ArticleCategory" NOT NULL DEFAULT 'AUTRE',
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "dedupeHash" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_entity_links" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "article_entity_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guarantees_dealId_idx" ON "guarantees"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_assumptions_dealId_key" ON "financial_assumptions"("dealId");

-- CreateIndex
CREATE INDEX "graph_entities_organizationId_idx" ON "graph_entities"("organizationId");

-- CreateIndex
CREATE INDEX "graph_entities_type_idx" ON "graph_entities"("type");

-- CreateIndex
CREATE INDEX "deal_entity_links_entityId_idx" ON "deal_entity_links"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "deal_entity_links_dealId_entityId_role_key" ON "deal_entity_links"("dealId", "entityId", "role");

-- CreateIndex
CREATE INDEX "graph_relations_organizationId_idx" ON "graph_relations"("organizationId");

-- CreateIndex
CREATE INDEX "graph_relations_fromEntityId_idx" ON "graph_relations"("fromEntityId");

-- CreateIndex
CREATE INDEX "graph_relations_toEntityId_idx" ON "graph_relations"("toEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "news_sources_organizationId_name_key" ON "news_sources"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "articles_dedupeHash_key" ON "articles"("dedupeHash");

-- CreateIndex
CREATE INDEX "articles_organizationId_idx" ON "articles"("organizationId");

-- CreateIndex
CREATE INDEX "articles_category_idx" ON "articles"("category");

-- CreateIndex
CREATE INDEX "articles_publishedAt_idx" ON "articles"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "article_entity_links_articleId_entityId_key" ON "article_entity_links"("articleId", "entityId");

-- AddForeignKey
ALTER TABLE "guarantees" ADD CONSTRAINT "guarantees_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_assumptions" ADD CONSTRAINT "financial_assumptions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_entities" ADD CONSTRAINT "graph_entities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_entity_links" ADD CONSTRAINT "deal_entity_links_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_entity_links" ADD CONSTRAINT "deal_entity_links_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_relations" ADD CONSTRAINT "graph_relations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_relations" ADD CONSTRAINT "graph_relations_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_relations" ADD CONSTRAINT "graph_relations_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_sources" ADD CONSTRAINT "news_sources_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "news_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_entity_links" ADD CONSTRAINT "article_entity_links_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_entity_links" ADD CONSTRAINT "article_entity_links_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "graph_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
