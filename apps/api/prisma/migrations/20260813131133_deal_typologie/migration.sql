-- Replaces the coarse financing-model DealType (Crowdfunding / Fractionné /
-- Promotion / Marchand de biens / Autre) with the real-estate operation
-- typology used in the source spreadsheet. Existing rows are remapped by
-- ALTER COLUMN ... USING so the @@index([type]) on "deals" survives
-- untouched (no column drop/recreate).
--
-- Mapping for existing data:
--   PROMOTION          -> PROMOTION_IMMOBILIERE (direct equivalent)
--   MARCHAND_DE_BIENS  -> MARCHAND_DE_BIENS_SANS_TRAVAUX (closest family
--                          match; the avec/sans travaux split didn't exist
--                          before, "sans travaux" is the more conservative
--                          default of the two)
--   CROWDFUNDING, FRACTIONNE, AUTRE -> PROMOTION_IMMOBILIERE (no equivalent
--                          in the new typology at all; provisional
--                          placeholder — these deals need manual review)

CREATE TYPE "DealType_new" AS ENUM (
  'PROMOTION_IMMOBILIERE',
  'DIVISION_PARCELLAIRE',
  'DIVISION_FONCIERE',
  'MISE_EN_COPROPRIETE',
  'AMENAGEMENT_FONCIER',
  'MARCHAND_DE_BIENS_AVEC_TRAVAUX',
  'MARCHAND_DE_BIENS_SANS_TRAVAUX',
  'REFINANCEMENT_FONDS_PROPRES',
  'REFINANCEMENT_ACTIF',
  'REFINANCEMENT_STOCK'
);

-- Leaves a visible trail on every deal whose typology couldn't be mapped
-- with confidence, so "needs manual review" isn't silently lost the
-- moment the old enum value is overwritten below — it shows up right in
-- the deal's own Notes tab instead of depending on someone remembering
-- this migration ran. authorId has no "system" option in the schema, so
-- it's attributed to the deal's own creator, same as any other note.
INSERT INTO "notes" (id, "dealId", "authorId", content, "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  id,
  "createdById",
  'Typologie migrée automatiquement vers « Promotion immobilière » (ancien type : ' || "type"::text ||
    ') — aucun équivalent direct dans la nouvelle typologie, à corriger manuellement.',
  now(),
  now()
FROM "deals"
WHERE "type"::text IN ('CROWDFUNDING', 'FRACTIONNE', 'AUTRE');

INSERT INTO "notes" (id, "dealId", "authorId", content, "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  id,
  "createdById",
  'Typologie migrée automatiquement vers « Marchand de biens sans travaux » (ancien type : Marchand de biens, sans distinction avec/sans travaux) — vérifier si « avec travaux » serait plus juste.',
  now(),
  now()
FROM "deals"
WHERE "type"::text = 'MARCHAND_DE_BIENS';

ALTER TABLE "deals" ALTER COLUMN "type" TYPE "DealType_new" USING (
  CASE "type"::text
    WHEN 'PROMOTION' THEN 'PROMOTION_IMMOBILIERE'
    WHEN 'MARCHAND_DE_BIENS' THEN 'MARCHAND_DE_BIENS_SANS_TRAVAUX'
    ELSE 'PROMOTION_IMMOBILIERE'
  END::"DealType_new"
);

DROP TYPE "DealType";
ALTER TYPE "DealType_new" RENAME TO "DealType";
