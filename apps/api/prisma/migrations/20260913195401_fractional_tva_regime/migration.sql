-- CreateEnum
CREATE TYPE "FractionalTvaRegime" AS ENUM ('NON_ASSUJETTI', 'MARGE', 'PRIX_TOTAL_OPTION_LOYERS');

-- AlterTable
ALTER TABLE "fractional_sources_uses" ADD COLUMN     "regimeTva" "FractionalTvaRegime" NOT NULL DEFAULT 'NON_ASSUJETTI',
ADD COLUMN     "tvaRecuperationDelaiMois" INTEGER,
ADD COLUMN     "tvaTauxPct" DECIMAL(5,2);
