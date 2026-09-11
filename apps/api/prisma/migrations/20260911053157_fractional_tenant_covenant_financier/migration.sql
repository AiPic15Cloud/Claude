-- AlterTable
ALTER TABLE "fractional_leases" ADD COLUMN     "caLocataireAnnuel" DECIMAL(16,2),
ADD COLUMN     "ebitdaLocataireAnnuel" DECIMAL(16,2),
ADD COLUMN     "exerciceFinancierAsOf" TIMESTAMP(3),
ADD COLUMN     "tresorerieLocataire" DECIMAL(16,2);
