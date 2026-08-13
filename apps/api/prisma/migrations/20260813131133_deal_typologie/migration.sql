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

ALTER TABLE "deals" ALTER COLUMN "type" TYPE "DealType_new" USING (
  CASE "type"::text
    WHEN 'PROMOTION' THEN 'PROMOTION_IMMOBILIERE'
    WHEN 'MARCHAND_DE_BIENS' THEN 'MARCHAND_DE_BIENS_SANS_TRAVAUX'
    ELSE 'PROMOTION_IMMOBILIERE'
  END::"DealType_new"
);

DROP TYPE "DealType";
ALTER TYPE "DealType_new" RENAME TO "DealType";
