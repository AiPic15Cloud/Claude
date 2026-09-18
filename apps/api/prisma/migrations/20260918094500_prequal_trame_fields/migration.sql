-- AlterTable
ALTER TABLE "prequalification_cases" ADD COLUMN     "analystImpressionNote" TEXT;

-- AlterTable
ALTER TABLE "prequalification_financial_models" ADD COLUMN     "guaranteesNote" TEXT,
ADD COLUMN     "montantDecaisseNotaire" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "prequalification_project_profiles" ADD COLUMN     "commercialisationNote" TEXT,
ADD COLUMN     "urbanismeNote" TEXT;
