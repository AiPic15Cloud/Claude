import {
  computeAnnualCorporateTax,
  computeExitCapitalGainTax,
  computeAnnualCfe,
  resolveCfeCoefficient,
  computeAnnualCrl,
  isCrlApplicable,
  computeResale1115Complement,
} from './tax-engine.util';

describe('computeAnnualCorporateTax', () => {
  it('ne taxe rien et grossit le report quand le résultat est déficitaire', () => {
    const result = computeAnnualCorporateTax({ taxableProfitBeforeCarryforward: -10000, carryforwardDeficitStart: 5000 });
    expect(result.corporateTaxDue).toBe(0);
    expect(result.taxableProfitAfterCarryforward).toBe(0);
    expect(result.carryforwardDeficitEnd).toBe(15000);
  });

  it('impute le report déficitaire avant de taxer un résultat positif', () => {
    const result = computeAnnualCorporateTax({ taxableProfitBeforeCarryforward: 30000, carryforwardDeficitStart: 20000 });
    // 30 000 - 20 000 imputés = 10 000 imposable, sous le plafond PME (42 500) => taux réduit 15 %.
    expect(result.taxableProfitAfterCarryforward).toBe(10000);
    expect(result.carryforwardDeficitEnd).toBe(0);
    expect(result.corporateTaxDue).toBeCloseTo(1500);
  });

  it('applique le taux réduit PME sous le plafond puis le taux normal au-delà', () => {
    const result = computeAnnualCorporateTax({ taxableProfitBeforeCarryforward: 50000, carryforwardDeficitStart: 0 });
    // 42 500 x 15% + 7 500 x 25%
    expect(result.corporateTaxDue).toBeCloseTo(42500 * 0.15 + 7500 * 0.25);
  });

  it("n'impute jamais plus que le résultat de l'exercice (pas de déficit négatif)", () => {
    const result = computeAnnualCorporateTax({ taxableProfitBeforeCarryforward: 1000, carryforwardDeficitStart: 50000 });
    expect(result.taxableProfitAfterCarryforward).toBe(0);
    expect(result.corporateTaxDue).toBe(0);
    expect(result.carryforwardDeficitEnd).toBe(49000);
  });
});

describe('computeExitCapitalGainTax', () => {
  it('impute le solde de déficit reportable restant sur la plus-value avant de taxer', () => {
    const result = computeExitCapitalGainTax({ capitalGain: 100000, remainingCarryforwardDeficit: 40000 });
    expect(result.taxableCapitalGainAfterCarryforward).toBe(60000);
    expect(result.capitalGainTaxDue).toBeCloseTo(15000); // 60 000 x 25%
  });

  it('ne taxe jamais une plus-value négative', () => {
    const result = computeExitCapitalGainTax({ capitalGain: -5000, remainingCarryforwardDeficit: 0 });
    expect(result.taxableCapitalGainAfterCarryforward).toBe(0);
    expect(result.capitalGainTaxDue).toBe(0);
  });
});

describe('CFE', () => {
  it('coefficients : 0 à la création, 50% l\'année suivante, 100% ensuite', () => {
    expect(resolveCfeCoefficient(1)).toBe(0);
    expect(resolveCfeCoefficient(2)).toBe(0.5);
    expect(resolveCfeCoefficient(3)).toBe(1);
    expect(resolveCfeCoefficient(10)).toBe(1);
  });

  it("l'année de sortie doit la CFE en entier même si le coefficient normal serait réduit", () => {
    const due = computeAnnualCfe({ holdingYear: 2, isExitYear: true, annualCfeFullBase: 1000 });
    expect(due).toBe(1000);
  });

  it('applique le coefficient normal hors année de sortie', () => {
    const due = computeAnnualCfe({ holdingYear: 2, isExitYear: false, annualCfeFullBase: 1000 });
    expect(due).toBe(500);
  });
});

describe('CRL', () => {
  it("n'est due que si l'immeuble a plus de 15 ans", () => {
    expect(isCrlApplicable(15)).toBe(false);
    expect(isCrlApplicable(16)).toBe(true);
  });

  it('vaut 0 si non applicable, quel que soit le loyer', () => {
    expect(computeAnnualCrl({ rentsNotSubjectToVat: 100000, applicable: false })).toBe(0);
  });

  it('applique le taux par défaut de 2,5% aux loyers non soumis à TVA', () => {
    expect(computeAnnualCrl({ rentsNotSubjectToVat: 100000, applicable: true })).toBeCloseTo(2500);
  });
});

describe('computeResale1115Complement', () => {
  it("ne déclenche rien tant que l'engagement de revente n'est pas dépassé", () => {
    const result = computeResale1115Complement({ holdingMonthsAtExit: 60, dutyBase: 1000000 });
    expect(result.commitmentBreached).toBe(false);
    expect(result.totalDue).toBe(0);
  });

  it('calcule le différentiel de droits et l\'intérêt de retard au-delà de l\'engagement', () => {
    const result = computeResale1115Complement({ holdingMonthsAtExit: 66, dutyBase: 1000000 });
    expect(result.commitmentBreached).toBe(true);
    // (5,80665% - 0,71498%) x 1 000 000
    expect(result.dutyComplementDue).toBeCloseTo((5.80665 - 0.71498) * 10000, 1);
    // 6 mois de dépassement x 0,2%/mois
    expect(result.lateInterestDue).toBeCloseTo(result.dutyComplementDue * 0.002 * 6, 1);
    expect(result.totalDue).toBeCloseTo(result.dutyComplementDue + result.lateInterestDue, 1);
  });
});
