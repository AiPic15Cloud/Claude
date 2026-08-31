-- Fraîcheur des données externes (section 6, brief "Le Traçotin") : date du
-- dernier appel réussi à chaque source externe, indépendamment du fait que
-- le résultat ait changé. Nullable, jamais renseigné rétroactivement pour
-- les dossiers existants — "jamais vérifié" est un état honnête, pas une
-- valeur à fabriquer.
ALTER TABLE "deals" ADD COLUMN "porteurCheckedAt" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN "riskDataCheckedAt" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN "dpeCheckedAt" TIMESTAMP(3);
