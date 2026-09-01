-- AlterTable
ALTER TABLE "guarantees" ADD COLUMN     "substantiveDefect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "substantiveDefectNote" TEXT;

