-- Passage au score additif unique (v3.0, spec "Le Traçotin" A.2) : les 3
-- sous-scores Quality/Performance/EWS n'existent plus conceptuellement,
-- seul compositeScore reste renseigné pour les nouvelles lignes. L'historique
-- existant (modelVersion risk-engine-v2.1) garde ses valeurs intactes.
ALTER TABLE "risk_score_snapshots" ALTER COLUMN "qualityScore" DROP NOT NULL;
ALTER TABLE "risk_score_snapshots" ALTER COLUMN "performanceScore" DROP NOT NULL;
ALTER TABLE "risk_score_snapshots" ALTER COLUMN "ewsScore" DROP NOT NULL;
