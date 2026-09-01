-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PROMOTEUR', 'BANQUE', 'NOTAIRE', 'ARCHITECTE', 'COLLECTIVITE', 'INVESTISSEUR', 'PLATEFORME', 'OPERATION');

-- CreateEnum
CREATE TYPE "EntityDomain" AS ENUM ('PORTFOLIO', 'MARKET');

-- CreateEnum
CREATE TYPE "RelationshipCoverage" AS ENUM ('UNKNOWN', 'PARTIAL', 'SUBSTANTIAL', 'VERIFIED');

-- CreateEnum
CREATE TYPE "EntityIdentifierType" AS ENUM ('SIREN', 'SIRET', 'RCS', 'AUTRE');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'ENDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('DECLARED', 'DOCUMENTED', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "RelationshipEventType" AS ENUM ('CREATED', 'AMOUNT_CHANGED', 'PERCENTAGE_CHANGED', 'STATUS_CHANGED', 'CONFIDENCE_CHANGED', 'EVIDENCE_ADDED', 'ENDED');

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "EntityType" NOT NULL,
    "domain" "EntityDomain" NOT NULL DEFAULT 'PORTFOLIO',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "coverage" "RelationshipCoverage" NOT NULL DEFAULT 'UNKNOWN',
    "mirrorsDealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_identifiers" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "EntityIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "entity_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_aliases" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "entity_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_types" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "relationship_types_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "typeKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "amount" DECIMAL(14,2),
    "percentage" DECIMAL(5,2),
    "criticality" INTEGER NOT NULL DEFAULT 0,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "confidence" "RelationshipCoverage" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_evidence" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "level" "EvidenceLevel" NOT NULL,
    "source" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationship_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_events" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "eventType" "RelationshipEventType" NOT NULL,
    "previousAmount" DECIMAL(14,2),
    "newAmount" DECIMAL(14,2),
    "previousPercentage" DECIMAL(5,2),
    "newPercentage" DECIMAL(5,2),
    "previousStatus" "RelationshipStatus",
    "newStatus" "RelationshipStatus",
    "previousConfidence" "RelationshipCoverage",
    "newConfidence" "RelationshipCoverage",
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationship_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entities_mirrorsDealId_key" ON "entities"("mirrorsDealId");

-- CreateIndex
CREATE INDEX "entities_organizationId_domain_idx" ON "entities"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "entities_type_idx" ON "entities"("type");

-- CreateIndex
CREATE INDEX "entity_identifiers_type_value_idx" ON "entity_identifiers"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "entity_identifiers_entityId_type_value_key" ON "entity_identifiers"("entityId", "type", "value");

-- CreateIndex
CREATE INDEX "entity_aliases_entityId_idx" ON "entity_aliases"("entityId");

-- CreateIndex
CREATE INDEX "relationships_organizationId_idx" ON "relationships"("organizationId");

-- CreateIndex
CREATE INDEX "relationships_sourceEntityId_idx" ON "relationships"("sourceEntityId");

-- CreateIndex
CREATE INDEX "relationships_targetEntityId_idx" ON "relationships"("targetEntityId");

-- CreateIndex
CREATE INDEX "relationships_typeKey_idx" ON "relationships"("typeKey");

-- CreateIndex
CREATE INDEX "relationship_evidence_relationshipId_idx" ON "relationship_evidence"("relationshipId");

-- CreateIndex
CREATE INDEX "relationship_events_relationshipId_idx" ON "relationship_events"("relationshipId");

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_mirrorsDealId_fkey" FOREIGN KEY ("mirrorsDealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_identifiers" ADD CONSTRAINT "entity_identifiers_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_typeKey_fkey" FOREIGN KEY ("typeKey") REFERENCES "relationship_types"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_evidence" ADD CONSTRAINT "relationship_evidence_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_evidence" ADD CONSTRAINT "relationship_evidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_events" ADD CONSTRAINT "relationship_events_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Données : seed des types de relation ─────────────────────────────
-- Repris tels quels de l'ancien enum GraphRelationType + deux nouveaux,
-- cités par B.3 (groupe économique, garantie partagée) mais pas encore
-- utilisés dans ce lot — créés maintenant pour ne pas re-migrer plus tard.
INSERT INTO "relationship_types" ("key", "label", "category", "description") VALUES
  ('PARTENAIRE', 'Partenaire', 'Ownership', 'Partenariat commercial ou capitalistique entre deux entités.'),
  ('FINANCEUR', 'Financeur', 'Financial', 'Une entité finance ou co-finance une autre entité ou une opération.'),
  ('CONSEIL', 'Conseil', 'Legal', 'Relation de conseil (notaire, architecte, avocat...).'),
  ('CONCURRENT', 'Concurrent', 'Projects', 'Deux plateformes ou opérateurs en concurrence directe.'),
  ('AUTRE', 'Autre', 'Autre', 'Relation ne correspondant à aucune autre catégorie.'),
  ('GROUPE_ECONOMIQUE', 'Groupe économique', 'Ownership', 'Deux entités appartiennent au même groupe économique — pas encore consommé (B.3).'),
  ('CAUTION_PARTAGEE', 'Caution partagée', 'Guarantees', 'Une même sûreté/caution couvre plusieurs opérations — pas encore consommé (B.3).');

-- ── Données : migration des GraphEntity → Entity ─────────────────────
-- Même id (traçabilité directe). Domaine MARKET pour les plateformes
-- concurrentes, PORTFOLIO pour tout le reste. Coverage UNKNOWN par
-- défaut — honnête, rien n'a encore été vérifié dans ce nouveau modèle.
INSERT INTO "entities" ("id", "organizationId", "type", "domain", "name", "description", "metadata", "coverage", "createdAt", "updatedAt")
SELECT
  ge."id",
  ge."organizationId",
  ge."type"::text::"EntityType",
  CASE WHEN ge."type" = 'PLATEFORME' THEN 'MARKET'::"EntityDomain" ELSE 'PORTFOLIO'::"EntityDomain" END,
  ge."name",
  ge."description",
  ge."metadata",
  'UNKNOWN'::"RelationshipCoverage",
  ge."createdAt",
  ge."updatedAt"
FROM "graph_entities" ge;

-- ── Données : SIREN existants → EntityIdentifier ─────────────────────
INSERT INTO "entity_identifiers" ("id", "entityId", "type", "value")
SELECT
  'mig_' || ge."id",
  ge."id",
  'SIREN'::"EntityIdentifierType",
  ge."siren"
FROM "graph_entities" ge
WHERE ge."siren" IS NOT NULL;

-- ── Données : chaque Deal devient une Entity miroir (type OPERATION) ──
-- Coverage VERIFIED : c'est l'opération elle-même, donnée de première
-- main, pas une observation tierce à vérifier.
INSERT INTO "entities" ("id", "organizationId", "type", "domain", "name", "description", "coverage", "mirrorsDealId", "createdAt", "updatedAt")
SELECT
  'deal_' || d."id",
  d."organizationId",
  'OPERATION'::"EntityType",
  'PORTFOLIO'::"EntityDomain",
  d."name",
  d."reference",
  'VERIFIED'::"RelationshipCoverage",
  d."id",
  d."createdAt",
  d."updatedAt"
FROM "deals" d;

-- ── Données : migration des GraphRelation → Relationship ─────────────
-- Même id. typeKey réutilise directement l'ancien type (les 5 valeurs
-- de GraphRelationType existent toutes dans relationship_types ci-dessus).
-- status ACTIVE et confidence UNKNOWN par défaut — rien n'a été vérifié
-- dans ce nouveau modèle, ce n'est pas un fait constaté.
INSERT INTO "relationships" ("id", "organizationId", "sourceEntityId", "targetEntityId", "typeKey", "startedAt", "status", "confidence", "createdAt", "updatedAt")
SELECT
  gr."id",
  gr."organizationId",
  gr."fromEntityId",
  gr."toEntityId",
  gr."type"::text,
  gr."createdAt",
  'ACTIVE'::"RelationshipStatus",
  'UNKNOWN'::"RelationshipCoverage",
  gr."createdAt",
  gr."createdAt"
FROM "graph_relations" gr;

-- ── Données : une preuve DECLARED par relation migrée ────────────────
-- createdById NULL : une relation migrée n'a pas d'auteur réel — jamais
-- attribuée à quelqu'un qui ne l'a pas créée.
INSERT INTO "relationship_evidence" ("id", "relationshipId", "level", "source", "createdById", "createdAt")
SELECT
  'mig_' || gr."id",
  gr."id",
  'DECLARED'::"EvidenceLevel",
  'Migration automatique depuis l''ancien modèle GraphRelation',
  NULL,
  gr."createdAt"
FROM "graph_relations" gr;
