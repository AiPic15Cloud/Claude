export interface CompetitorWatchlistEntry {
  name: string;
  category: 'CROWDFUNDING' | 'FRACTIONNE';
  country?: string;
  verificationStatus?: 'ACTIF' | 'PIVOTE' | 'LIQUIDE' | 'REDRESSEMENT' | 'A_VERIFIER';
  verificationNote?: string;
  website?: string;
}

// Competitive-watch list, researched and verified per-entity rather than
// inferred from platform names — several entries deliberately deviate from
// the "sounds like fractional" assumption: Tokimo and Livret P are
// fixed-term bonds tied to real-estate development/marchands de biens, not
// fractional rental ownership, so they're classified CROWDFUNDING despite
// operating in the real-estate space. Entries with verificationStatus
// A_VERIFIER are genuinely unconfirmed as of the last research pass — do
// not upgrade them to ACTIF without a fresh, sourced check.
//
// Shared by the demo seed (prisma/seed.ts) and the production watchlist
// endpoint (PlatformsController) so both apply the exact same data instead
// of two hand-maintained copies drifting apart.
export const COMPETITOR_WATCHLIST: CompetitorWatchlistEntry[] = [
  { name: 'La Première Brique', category: 'CROWDFUNDING', country: 'France' },
  { name: 'ClubFunding', category: 'CROWDFUNDING', country: 'France' },
  { name: 'Homunity', category: 'CROWDFUNDING', country: 'France' },
  { name: 'Fundimmo', category: 'CROWDFUNDING', country: 'France' },
  { name: 'Raizers', category: 'CROWDFUNDING', country: 'France' },
  { name: 'Monego', category: 'CROWDFUNDING', country: 'France' },
  { name: 'Anaxago', category: 'CROWDFUNDING', country: 'France' },
  {
    name: 'Tokimo',
    category: 'CROWDFUNDING',
    country: 'France',
    verificationStatus: 'ACTIF',
    verificationNote:
      "Crowdfunding classique (obligations à échéance fixe, marchands de biens/promotion) — pas de détention réelle ni de loyers récurrents, donc hors périmètre fractionné locatif malgré une classification antérieure erronée.",
  },
  { name: 'Proximea', category: 'CROWDFUNDING', country: 'France' },
  {
    name: 'Livret P',
    category: 'CROWDFUNDING',
    country: 'France',
    verificationStatus: 'ACTIF',
    verificationNote:
      "Crowdfunding classique (obligations à échéance fixe, marchands de biens/promotion) — pas de détention réelle ni de loyers récurrents, donc hors périmètre fractionné locatif malgré une classification antérieure erronée.",
  },
  {
    name: 'Tantiem',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'ACTIF',
    verificationNote: 'Leader du secteur, AUM ~9,8M€, agréé AMF PSFP, spécialiste commerce.',
  },
  {
    name: 'ATOA',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'ACTIF',
    verificationNote: 'Security tokens + fiducie, agrément AMF security tokens.',
  },
  {
    name: 'Baltis (Puzzle)',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'ACTIF',
    verificationNote:
      'Pivot réussi vers Puzzle (commerces + micro-logements Atom), +200 projets, 85M€ levés au global (crowdfunding + fractionné).',
  },
  {
    name: 'Bricks',
    category: 'CROWDFUNDING',
    country: 'France',
    verificationStatus: 'PIVOTE',
    verificationNote:
      "A quitté le fractionné locatif pour l'obligataire classique après controverses (démarrage contesté, investisseurs « collés » à -30%).",
  },
  {
    name: 'RealT',
    category: 'FRACTIONNE',
    country: 'États-Unis',
    verificationStatus: 'LIQUIDE',
    verificationNote: 'Liquidation judiciaire annoncée juillet 2026, ~700 biens Detroit sous fiduciaire, procédure en cours.',
  },
  {
    name: 'Stomea',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'A_VERIFIER',
    verificationNote:
      "Anciennement « Blocks » (royalties/club) — à vérifier si toujours fractionné locatif ou pivoté crowdfunding classique.",
  },
  {
    name: 'Blocshare',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'A_VERIFIER',
    verificationNote: 'Lancé fin 2022, dernière donnée fiable ancienne — à vérifier avant de s’appuyer dessus.',
  },
  {
    name: 'Meute Invest',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'LIQUIDE',
    verificationNote: 'Liquidé en juin 2025.',
  },
  {
    name: 'Fragment (Prello)',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'REDRESSEMENT',
    verificationNote: 'Redressement judiciaire en février 2025.',
  },
  {
    name: 'OPCAP',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'PIVOTE',
    verificationNote: 'A arrêté le fractionné locatif, recentré ailleurs — modèle actuel non confirmé.',
  },
  {
    name: 'Wally',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'A_VERIFIER',
    verificationNote: "Cité sur un forum spécialisé (Investisseurs Heureux) mais aucune confirmation d'activité 2026 fiable.",
  },
  {
    name: 'Fraktion',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'A_VERIFIER',
    verificationNote: "Cité sur un forum spécialisé (Investisseurs Heureux) mais aucune confirmation d'activité 2026 fiable.",
  },
  {
    name: 'Streal',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'A_VERIFIER',
    verificationNote: "Cité sur un forum spécialisé (Investisseurs Heureux) mais aucune confirmation d'activité 2026 fiable.",
  },
  {
    name: 'Brik Club',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'A_VERIFIER',
    verificationNote: "Cité sur un forum spécialisé (Investisseurs Heureux) mais aucune confirmation d'activité 2026 fiable.",
  },
  {
    name: 'Equito',
    category: 'FRACTIONNE',
    country: 'France',
    verificationStatus: 'A_VERIFIER',
    verificationNote: 'Aucune source récente fiable retrouvée sur le statut actuel.',
  },
  {
    name: 'EstateGuru',
    category: 'CROWDFUNDING',
    country: 'Estonie',
    verificationStatus: 'ACTIF',
    verificationNote: 'Doyen du secteur (2014), dette hypothécaire.',
  },
  {
    name: 'Profitus',
    category: 'CROWDFUNDING',
    country: 'Lituanie',
    verificationStatus: 'ACTIF',
    verificationNote: '~350M€ financés, 49k investisseurs, licence ECSP.',
  },
  {
    name: 'Reinvest24',
    category: 'FRACTIONNE',
    country: 'Lettonie',
    verificationStatus: 'ACTIF',
    verificationNote: 'Equity locatif.',
  },
  {
    name: 'LANDE',
    category: 'FRACTIONNE',
    country: 'Lettonie',
    verificationStatus: 'ACTIF',
    verificationNote: 'Niche agricole, licence ECSP depuis février 2024.',
  },
  {
    name: 'Housers',
    category: 'FRACTIONNE',
    country: 'Espagne/Portugal',
    verificationStatus: 'A_VERIFIER',
    verificationNote: 'Cité comme actif par plusieurs comparatifs récents — à corroborer avant intégration ferme.',
  },
  {
    name: 'Wiseed',
    category: 'CROWDFUNDING',
    country: 'France',
    verificationStatus: 'ACTIF',
    verificationNote: 'Pertes en forte hausse (Baromètre Argent & Salaire, avril 2026) — actif mais en difficulté, pas fermé.',
  },
];
