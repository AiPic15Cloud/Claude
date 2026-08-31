// Version des poids/seuils du Risk Engine, stampée sur chaque
// RiskScoreSnapshot (risk-history.service.ts) — à incrémenter manuellement à
// chaque changement de pondération/seuil (additive-risk.util.ts,
// hard-override-rules.ts), pour que l'historique reste non-ambigu si la
// formule change à nouveau.
//
// v3.0 : remplacement du blend pondéré Quality/Performance/EWS par un score
// additif unique (spec "Le Traçotin" A.2) — qualityScore/performanceScore/
// ewsScore ne sont plus renseignés pour les lignes produites sous cette
// version (voir RiskScoreSnapshot.qualityScore et suivants, nullable).
//
// Fichier séparé (plutôt qu'un export de risk-engine.service.ts) pour éviter
// un import circulaire entre risk-engine.service.ts et risk-history.service.ts.
export const RISK_MODEL_VERSION = 'risk-engine-v3.0-additive';
