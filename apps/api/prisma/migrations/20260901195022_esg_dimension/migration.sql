-- CreateEnum
CREATE TYPE "EsgAssessment" AS ENUM ('OUI', 'NON', 'INCONNU');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "esgAccessibilite" TEXT,
ADD COLUMN     "esgConformiteReglementaire" "EsgAssessment",
ADD COLUMN     "esgEmploisChantierEstimes" INTEGER,
ADD COLUMN     "esgGestionEauxPluviales" TEXT,
ADD COLUMN     "esgMateriauxBasCarbone" "EsgAssessment",
ADD COLUMN     "esgNotes" TEXT;

