export interface FreshnessSource {
  key: string;
  label: string;
  checkedAt: Date | null;
  upToDate: boolean;
}

export interface DataFreshnessResult {
  sources: FreshnessSource[];
  confidencePct: number | null;
}

export interface DataFreshnessInput {
  hasSiren: boolean;
  porteurCheckedAt: Date | null;
  hasCoords: boolean;
  riskDataCheckedAt: Date | null;
  hasPostcode: boolean;
  dpeCheckedAt: Date | null;
}

/** Seuil du document lui-même (section 5 : "sûreté vérifiée dans les 30 derniers jours"), repris tel quel comme seuil générique de fraîcheur plutôt que d'inventer un autre chiffre. */
const FRESHNESS_THRESHOLD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function isUpToDate(checkedAt: Date | null, now: Date): boolean {
  if (checkedAt === null) return false;
  return (now.getTime() - checkedAt.getTime()) / DAY_MS <= FRESHNESS_THRESHOLD_DAYS;
}

/**
 * Score de confiance du dossier basé sur la fraîcheur des sources externes
 * (section 6 du brief "Le Traçotin") — distinct du moteur de complétude
 * (section 5, completeness.util.ts) qui porte sur des données internes au
 * dossier. Ne considère que les sources applicables (ex. pas de SIREN → pas
 * de ligne SIRENE/BODACC) pour ne jamais pénaliser un dossier sur une source
 * qui ne le concerne pas.
 */
export function computeDataFreshness(input: DataFreshnessInput, now: Date = new Date()): DataFreshnessResult {
  const sources: FreshnessSource[] = [];

  if (input.hasSiren) {
    sources.push({
      key: 'SIRENE_BODACC',
      label: 'SIRENE / BODACC (porteur)',
      checkedAt: input.porteurCheckedAt,
      upToDate: isUpToDate(input.porteurCheckedAt, now),
    });
  }

  if (input.hasCoords) {
    sources.push({
      key: 'GEORISQUES',
      label: 'Géorisques / IGN / OpenStreetMap',
      checkedAt: input.riskDataCheckedAt,
      upToDate: isUpToDate(input.riskDataCheckedAt, now),
    });
  }

  if (input.hasPostcode) {
    sources.push({
      key: 'ADEME',
      label: 'ADEME (DPE)',
      checkedAt: input.dpeCheckedAt,
      upToDate: isUpToDate(input.dpeCheckedAt, now),
    });
  }

  if (sources.length === 0) {
    return { sources, confidencePct: null };
  }

  const upToDateCount = sources.filter((s) => s.upToDate).length;
  return { sources, confidencePct: Math.round((upToDateCount / sources.length) * 100) };
}
