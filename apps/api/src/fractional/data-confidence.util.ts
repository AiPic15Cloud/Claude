import type { FractionalProvenanceConfidence, FractionalProvenanceVerificationStatus } from '@prisma/client';

/**
 * Data Confidence Engine — agrège les enregistrements de provenance
 * (data-provenance.service.ts) en un score global par dossier, sur le
 * registre fermé des champs jugés critiques pour une décision IC
 * (CRITICAL_FIELD_KEYS_BY_ENTITY_TYPE ci-dessous). Répond à la question
 * "un TRI calculé avec 40% de données non vérifiées ne vaut pas grand
 * chose" : un champ critique jamais sourcé compte 0, jamais une valeur
 * masquée comme fiable par défaut.
 *
 * Barème (FIELD_SCORE_TABLE) : paramètres nommés explicites, mêmes
 * principes que stress-testing.util.ts — des poids raisonnables par
 * défaut, à calibrer une fois des dossiers réels notés disponibles.
 */

export const CRITICAL_FIELD_KEYS_BY_ENTITY_TYPE: Record<string, { fieldKey: string; label: string }[]> = {
  PROJECT: [
    { fieldKey: 'prixNetVendeur', label: 'Prix net vendeur' },
    { fieldKey: 'exitValue', label: "Valeur de sortie retenue" },
  ],
  LEASE: [
    { fieldKey: 'loyerFacialAnnuel', label: 'Loyer facial annuel' },
    { fieldKey: 'dateTerme', label: 'Date de terme du bail' },
    { fieldKey: 'breakDates', label: 'Dates de break' },
  ],
};

export const FIELD_SCORE_TABLE: Record<FractionalProvenanceVerificationStatus, Record<FractionalProvenanceConfidence, number>> = {
  VERIFIED: { HIGH: 100, MEDIUM: 85, LOW: 70 },
  CROSS_CHECKED: { HIGH: 80, MEDIUM: 65, LOW: 50 },
  UNVERIFIED: { HIGH: 50, MEDIUM: 35, LOW: 20 },
  CONFLICTING: { HIGH: 10, MEDIUM: 10, LOW: 10 },
};

export interface CriticalFieldRef {
  entityType: string;
  entityId: string;
  fieldKey: string;
  label: string;
}

export interface ProvenanceRecordLike {
  entityType: string;
  entityId: string;
  fieldKey: string;
  verificationStatus: FractionalProvenanceVerificationStatus;
  confidence: FractionalProvenanceConfidence;
}

export interface FieldConfidenceResult extends CriticalFieldRef {
  scorePct: number;
  status: 'MISSING' | FractionalProvenanceVerificationStatus;
}

export interface DataConfidenceResult {
  scorePct: number;
  fieldScores: FieldConfidenceResult[];
  missingCount: number;
  totalCount: number;
}

function provenanceKey(entityType: string, entityId: string, fieldKey: string): string {
  return `${entityType}:${entityId}:${fieldKey}`;
}

export function computeDataConfidence(criticalFields: CriticalFieldRef[], provenanceRecords: ProvenanceRecordLike[]): DataConfidenceResult {
  const byKey = new Map(provenanceRecords.map((p) => [provenanceKey(p.entityType, p.entityId, p.fieldKey), p]));

  let missingCount = 0;
  const fieldScores: FieldConfidenceResult[] = criticalFields.map((field) => {
    const record = byKey.get(provenanceKey(field.entityType, field.entityId, field.fieldKey));
    if (!record) {
      missingCount += 1;
      return { ...field, scorePct: 0, status: 'MISSING' };
    }
    return { ...field, scorePct: FIELD_SCORE_TABLE[record.verificationStatus][record.confidence], status: record.verificationStatus };
  });

  const scorePct = fieldScores.length > 0 ? Math.round(fieldScores.reduce((sum, f) => sum + f.scorePct, 0) / fieldScores.length) : 0;

  return { scorePct, fieldScores, missingCount, totalCount: criticalFields.length };
}
