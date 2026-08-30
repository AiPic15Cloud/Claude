// Version des poids/seuils du Risk Engine, stampée sur chaque
// RiskScoreSnapshot (risk-history.service.ts) — à incrémenter manuellement à
// chaque changement de pondération/seuil (composite-risk.util.ts,
// hard-override-rules.ts, quality/performance/ews-score.util.ts), pour que
// l'historique reste non-ambigu si la formule change en Phase 2+.
//
// Fichier séparé (plutôt qu'un export de risk-engine.service.ts) pour éviter
// un import circulaire entre risk-engine.service.ts et risk-history.service.ts.
export const RISK_MODEL_VERSION = 'risk-engine-v2.1';
