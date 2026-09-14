import type { FractionalIndexationType } from '@prisma/client';
import { resolveLeaseGrowthPct, type IndexGrowthRates } from './rent-indexation.util';
import { nextBreakOrTerm, monthsBetween } from './lease-security.util';

/**
 * Break Event Engine (spec V2 §9) — jusqu'ici WALB/WALT (lease-security.util.ts)
 * étaient un cul-de-sac : calculés correctement à partir de breakDates, mais
 * jamais reconnectés à la boucle de projection annuelle (rent-indexation.util.ts
 * projetait le loyer facial en ligne droite sur tout l'horizon, sans jamais lire
 * breakDates). Un dossier pouvait donc afficher "WALB 2,5 ans" et un cash-flow
 * sur 8 ans sans la moindre rupture — exactement la contradiction que ce moteur
 * supprime en committant chaque bail à un événement de break réel dans le
 * cash-flow.
 *
 * Périmètre : seule la PROCHAINE échéance (break ou terme, cf. nextBreakOrTerm)
 * est modélisée comme point de bifurcation par bail — même simplification que
 * lease-security.util.ts pour le calcul du WALB. Des breaks en cascade après le
 * premier relèveraient d'un raffinement ultérieur, pas nécessaire pour corriger
 * la contradiction actuelle.
 *
 * Trois branches par bail à l'échéance :
 * - BASE : le locataire reste (renouvellement) — la trajectoire indexée continue
 *   sans interruption. C'est exactement le comportement actuel de
 *   projectIndexedGpr ; BASE ne doit donc rien changer aux chiffres déjà
 *   affichés par défaut.
 * - DOWNSIDE : le locataire part — vacance, CAPEX de relocation, relocation à
 *   un loyer réduit (ERV réelle du bail quand renseignée — rental-reversion.util.ts —
 *   sinon repli sur un proxy générique, décote du loyer facial sortant),
 *   ré-indexation repartant de ce nouveau loyer.
 * - SEVERE : même mécanique, vacance plus longue et décote plus sévère.
 *
 * Magnitudes (vacance, décote, CAPEX de relocation) : paramètres nommés
 * explicites, mêmes principes que stress-testing.util.ts — des défauts
 * raisonnables à calibrer une fois des dossiers réels disponibles pour
 * recette, jamais une valeur inventée silencieuse.
 */

export type BreakScenario = 'BASE' | 'DOWNSIDE' | 'SEVERE';

export const BREAK_DOWNSIDE_VACANCY_MONTHS = 9;
export const BREAK_DOWNSIDE_RELET_HAIRCUT_PCT = 10;
export const BREAK_DOWNSIDE_RELETTING_CAPEX_PCT_OF_RENT = 100;

export const BREAK_SEVERE_VACANCY_MONTHS = 18;
export const BREAK_SEVERE_RELET_HAIRCUT_PCT = 25;
export const BREAK_SEVERE_RELETTING_CAPEX_PCT_OF_RENT = 150;

const DOWNSIDE_SCENARIO_PARAMS: Record<Exclude<BreakScenario, 'BASE'>, { vacancyMonths: number; reletHaircutPct: number; relettingCapexPctOfRent: number }> = {
  DOWNSIDE: {
    vacancyMonths: BREAK_DOWNSIDE_VACANCY_MONTHS,
    reletHaircutPct: BREAK_DOWNSIDE_RELET_HAIRCUT_PCT,
    relettingCapexPctOfRent: BREAK_DOWNSIDE_RELETTING_CAPEX_PCT_OF_RENT,
  },
  SEVERE: {
    vacancyMonths: BREAK_SEVERE_VACANCY_MONTHS,
    reletHaircutPct: BREAK_SEVERE_RELET_HAIRCUT_PCT,
    relettingCapexPctOfRent: BREAK_SEVERE_RELETTING_CAPEX_PCT_OF_RENT,
  },
};

export interface LeaseBreakInput {
  loyerFacialAnnuel: number;
  indexation: FractionalIndexationType;
  indexationCapPct: number | null;
  indexationFloorPct: number | null;
  dateEffet: Date;
  dateTerme: Date;
  breakDates: Date[];
  /**
   * Valeur locative de marché estimée (rental-reversion.util.ts) — quand
   * connue, sert de base réelle à la reloc DOWNSIDE/SEVERE au lieu du proxy
   * générique (décote sur le loyer facial). Absente/non renseignée = repli
   * sur l'ancien proxy, jamais une ERV devinée.
   */
  ervAnnuel?: number | null;
}

export interface LeaseYearBreakProjection {
  /** GPR de l'année pour ce bail, après effet éventuel du break. */
  rent: number;
  /** CAPEX de relocation généré à l'année du break (0 sauf l'année de bascule, scénarios DOWNSIDE/SEVERE). */
  relettingCapex: number;
  /** Vrai à partir de l'année où ce bail a basculé sur un nouveau loyer post-relocation (BASE : toujours faux). */
  isPostRelet: boolean;
}

/**
 * Projection d'un bail pour une année donnée (1 = première année de détention),
 * en tenant compte de son prochain break/terme et du scénario choisi.
 * En BASE, résultat identique bit-à-bit à l'ancienne formule
 * (loyerFacialAnnuel composé à growthPct), pour ne changer aucun chiffre
 * affiché par défaut tant qu'aucun scénario dégradé n'est explicitement
 * demandé.
 */
export function projectLeaseYearWithBreak(
  lease: LeaseBreakInput,
  indexGrowthRates: IndexGrowthRates,
  fallbackGrowthPct: number,
  asOfDate: Date,
  year: number,
  scenario: BreakScenario,
): LeaseYearBreakProjection {
  const growthPct = resolveLeaseGrowthPct(lease, indexGrowthRates, fallbackGrowthPct);
  const preBreakRentAtYear = (yr: number) => lease.loyerFacialAnnuel * Math.pow(1 + growthPct / 100, yr - 1);

  if (scenario === 'BASE') {
    return { rent: preBreakRentAtYear(year), relettingCapex: 0, isPostRelet: false };
  }

  const breakOrTerm = nextBreakOrTerm(lease, asOfDate);
  const monthsToBreak = monthsBetween(asOfDate, breakOrTerm);
  const breakYear = Math.ceil(monthsToBreak / 12);
  const yearStartMonths = (year - 1) * 12;
  const yearEndMonths = year * 12;

  if (breakYear <= 0 || monthsToBreak >= yearEndMonths) {
    // Break déjà passé avant l'horizon, ou pas encore atteint au cours de cette année : trajectoire normale.
    return { rent: preBreakRentAtYear(year), relettingCapex: 0, isPostRelet: false };
  }

  const { vacancyMonths, reletHaircutPct, relettingCapexPctOfRent } = DOWNSIDE_SCENARIO_PARAMS[scenario];
  const preBreakRentAtBreakYear = preBreakRentAtYear(breakYear);
  // Base de reloc : l'ERV réelle du bail (rental-reversion.util.ts), grandie
  // au même taux que le loyer facial jusqu'à l'année du break, quand
  // renseignée — sinon repli sur l'ancien proxy (décote sur le loyer facial
  // sortant, faute de toute donnée de marché). Le haircut DOWNSIDE/SEVERE
  // s'applique dans les deux cas : sur l'ERV, il représente la tension du
  // marché au moment de la relocation (négociation en-dessous de l'ERV
  // estimée) ; sur le proxy, il reste l'unique source de décote.
  const marketRentAtBreakYear = lease.ervAnnuel != null ? lease.ervAnnuel * Math.pow(1 + growthPct / 100, breakYear - 1) : preBreakRentAtBreakYear;
  const reletAnnualRentBase = marketRentAtBreakYear * (1 - reletHaircutPct / 100);
  // La vacance peut déborder au-delà de l'année du break — modélisée en mois
  // absolus (pas confinée à l'année du break) pour que SEVERE (vacance plus
  // longue) produise bien plusieurs années sans loyer, pas seulement une
  // décote de relocation plus forte que DOWNSIDE.
  const vacancyEndMonths = monthsToBreak + vacancyMonths;
  const reletStartYear = Math.max(breakYear, Math.ceil(vacancyEndMonths / 12) || 1);

  const preBreakFraction = Math.max(0, Math.min(yearEndMonths, monthsToBreak) - yearStartMonths) / 12;
  const vacantFraction = Math.max(0, Math.min(yearEndMonths, vacancyEndMonths) - Math.max(yearStartMonths, monthsToBreak)) / 12;
  const reletFraction = Math.max(0, 1 - preBreakFraction - vacantFraction);

  const reletYearsElapsed = Math.max(0, year - reletStartYear);
  const reletAnnualRent = reletAnnualRentBase * Math.pow(1 + growthPct / 100, reletYearsElapsed);

  const relettingCapex = year === breakYear ? preBreakRentAtBreakYear * (relettingCapexPctOfRent / 100) : 0;
  const blendedRent = preBreakRentAtYear(year) * preBreakFraction + reletAnnualRent * reletFraction;

  return { rent: blendedRent, relettingCapex, isPostRelet: true };
}

export interface PortfolioYearBreakProjection {
  grossPotentialRent: number;
  relettingCapex: number;
}

/** Somme sur le portefeuille de baux — mêmes paramètres que projectLeaseYearWithBreak, appliqués bail par bail. */
export function projectPortfolioWithBreaks(
  leases: LeaseBreakInput[],
  indexGrowthRates: IndexGrowthRates,
  fallbackGrowthPct: number,
  asOfDate: Date,
  year: number,
  scenario: BreakScenario,
): PortfolioYearBreakProjection {
  return leases.reduce(
    (acc, lease) => {
      const projection = projectLeaseYearWithBreak(lease, indexGrowthRates, fallbackGrowthPct, asOfDate, year, scenario);
      return { grossPotentialRent: acc.grossPotentialRent + projection.rent, relettingCapex: acc.relettingCapex + projection.relettingCapex };
    },
    { grossPotentialRent: 0, relettingCapex: 0 },
  );
}
