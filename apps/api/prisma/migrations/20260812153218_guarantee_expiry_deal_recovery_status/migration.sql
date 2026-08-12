-- CreateEnum
CREATE TYPE "DealRecoveryStatus" AS ENUM ('SAIN', 'EN_RETARD', 'PRE_CONTENTIEUX', 'PROCEDURE');

-- AlterEnum
ALTER TYPE "GuaranteeType" ADD VALUE 'FIDUCIE';

-- AlterTable: add recoveryStatus first, defaulting existing rows to SAIN
ALTER TABLE "deals" ADD COLUMN "recoveryStatus" "DealRecoveryStatus" NOT NULL DEFAULT 'SAIN';

-- Preserve existing data: contentieux=true was the coarser predecessor of
-- this 4-level field, closest to PRE_CONTENTIEUX (see schema.prisma comment)
UPDATE "deals" SET "recoveryStatus" = 'PRE_CONTENTIEUX' WHERE "contentieux" = true;

ALTER TABLE "deals" DROP COLUMN "contentieux";

-- AlterTable
ALTER TABLE "guarantees" ADD COLUMN "endDate" TIMESTAMP(3);
