import { evaluatePrequalFinancialFindings, type PrequalFinancialFindingsContext } from './prequal-rules.util';
import type { PrequalFinancialResult } from './prequal-financial.util';

function result(overrides: Partial<PrequalFinancialResult> = {}): PrequalFinancialResult {
  return {
    coutDeRevient: 50_000_000,
    chiffreAffaires: 60_000_000,
    lotsWithoutPriceCount: 0,
    marge: 10_000_000,
    margePct: 16.7,
    margeEcartVsAnnonceePts: null,
    coutDeRevientEcartVsDeclare: null,
    chiffreAffairesEcartVsDeclare: null,
    besoinMaxFinancement: null,
    prixSortiePondereParM2: null,
    pointMortAuM2: null,
    ltaPct: null,
    ltcPct: null,
    ltvPct: null,
    ...overrides,
  };
}

function context(overrides: Partial<PrequalFinancialFindingsContext> = {}): PrequalFinancialFindingsContext {
  return { declaredEquity: 5_000_000, provenEquity: 5_000_000, amountRequested: 40_000_000, ...overrides };
}

describe('evaluatePrequalFinancialFindings', () => {
  it('signale une marge négative en BLOCKING', () => {
    const findings = evaluatePrequalFinancialFindings(result({ marge: -1_000_000 }), context());
    expect(findings.some((f) => f.ruleId === 'MARGE_NEGATIVE' && f.severity === 'BLOCKING')).toBe(true);
  });

  it('ne signale pas de marge négative quand la marge est positive', () => {
    const findings = evaluatePrequalFinancialFindings(result(), context());
    expect(findings.some((f) => f.ruleId === 'MARGE_NEGATIVE')).toBe(false);
  });

  it('signale les lots sans prix en WATCH', () => {
    const findings = evaluatePrequalFinancialFindings(result({ lotsWithoutPriceCount: 2 }), context());
    const finding = findings.find((f) => f.ruleId === 'LOTS_SANS_PRIX');
    expect(finding?.severity).toBe('WATCH');
    expect(finding?.statement).toContain('2 lot');
  });

  it('signale un écart matériel de coût de revient (≥5%) vs la version opérateur', () => {
    const findings = evaluatePrequalFinancialFindings(result({ coutDeRevientEcartVsDeclare: 5_000_000 }), context());
    expect(findings.some((f) => f.ruleId === 'ECART_COUT_DE_REVIENT')).toBe(true);
  });

  it("n'ajoute pas de finding pour un écart de coût de revient inférieur au seuil", () => {
    const findings = evaluatePrequalFinancialFindings(result({ coutDeRevientEcartVsDeclare: 100_000 }), context());
    expect(findings.some((f) => f.ruleId === 'ECART_COUT_DE_REVIENT')).toBe(false);
  });

  it('signale un écart de marge en WATCH sous le double seuil, MATERIAL au-delà', () => {
    const watch = evaluatePrequalFinancialFindings(result({ margeEcartVsAnnonceePts: 6 }), context());
    expect(watch.find((f) => f.ruleId === 'ECART_MARGE')?.severity).toBe('WATCH');

    const material = evaluatePrequalFinancialFindings(result({ margeEcartVsAnnonceePts: 12 }), context());
    expect(material.find((f) => f.ruleId === 'ECART_MARGE')?.severity).toBe('MATERIAL');
  });

  it('signale un apport prouvé inférieur à l\'apport annoncé', () => {
    const findings = evaluatePrequalFinancialFindings(result(), context({ declaredEquity: 10_000_000, provenEquity: 5_000_000 }));
    expect(findings.some((f) => f.ruleId === 'APPORT_ANNONCE_SUPERIEUR_PROUVE')).toBe(true);
  });

  it('ne signale rien si apport prouvé = apport annoncé', () => {
    const findings = evaluatePrequalFinancialFindings(result(), context({ declaredEquity: 5_000_000, provenEquity: 5_000_000 }));
    expect(findings.some((f) => f.ruleId === 'APPORT_ANNONCE_SUPERIEUR_PROUVE')).toBe(false);
  });

  it('signale une absence totale de données apport en WATCH plutôt que de supposer un apport nul', () => {
    const findings = evaluatePrequalFinancialFindings(result(), context({ declaredEquity: null, provenEquity: null }));
    expect(findings.some((f) => f.ruleId === 'APPORT_NON_RENSEIGNE')).toBe(true);
  });

  it('signale un besoin de financement reconstitué supérieur au montant recherché', () => {
    const findings = evaluatePrequalFinancialFindings(
      result({ besoinMaxFinancement: 45_000_000 }),
      context({ amountRequested: 40_000_000 }),
    );
    expect(findings.some((f) => f.ruleId === 'BESOIN_SUPERIEUR_AU_MONTANT_RECHERCHE')).toBe(true);
  });

  it('signale une marge positive mais faible (<10%) en WATCH', () => {
    const findings = evaluatePrequalFinancialFindings(result({ margePct: 4.2 }), context());
    expect(findings.some((f) => f.ruleId === 'MARGE_FAIBLE')).toBe(true);
  });
});
