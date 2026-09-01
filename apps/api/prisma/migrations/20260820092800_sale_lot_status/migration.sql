-- Remplace le booléen "sold" par un statut de commercialisation à 4 valeurs
-- (OFFRE | PROMESSE_COMPROMIS | RESERVATION | VENDU) — préserve les données
-- existantes : sold=true devient VENDU, sold=false devient OFFRE (valeur la
-- plus proche sans inventer un statut intermédiaire qu'on ne peut pas connaître).
ALTER TABLE "sale_lots" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OFFRE';
UPDATE "sale_lots" SET "status" = 'VENDU' WHERE "sold" = true;
ALTER TABLE "sale_lots" DROP COLUMN "sold";
