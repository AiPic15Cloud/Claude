-- CreateEnum
CREATE TYPE "WorkspaceScope" AS ENUM ('FULL', 'FRACTIONAL_ONLY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "workspaceScope" "WorkspaceScope" NOT NULL DEFAULT 'FULL';
