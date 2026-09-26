import { computeStructureRevenueForecast, type StructureFeeInput } from './structure-revenue-forecast.util';

function makeFee(overrides: Partial<StructureFeeInput> = {}): StructureFeeInput {
  return {
    id: 'f1',
    projectId: 'p1',
    projectName: 'Parc Le 149',
    stakeholderId: 's1',
    stakeholderName: 'Nicolas',
    feeType: 'RUNNING',
    ratePct: null,
    fixedAmount: 10000,
    startYear: null,
    endYear: null,
    negotiationStatus: 'CONTRACTUALISEE',
    ...overrides,
  };
}

const CURRENT_YEAR = new Date().getFullYear();

describe('computeStructureRevenueForecast — spec Cockpit/Fractionné P2 §5.5', () => {
  it('classe un frais A_NEGOCIER en hypothétique, quelle que soit l\'année', () => {
    const result = computeStructureRevenueForecast([makeFee({ negotiationStatus: 'A_NEGOCIER' })], CURRENT_YEAR);
    expect(result.lines[0].category).toBe('HYPOTHETIQUE');
    expect(result.totalsByCategory.HYPOTHETIQUE).toBe(10000);
  });

  it('classe un frais PROPOSEE en proposé, quelle que soit l\'année', () => {
    const result = computeStructureRevenueForecast([makeFee({ negotiationStatus: 'PROPOSEE' })], CURRENT_YEAR);
    expect(result.lines[0].category).toBe('PROPOSE');
  });

  it('un frais CONTRACTUALISEE dont l\'année est déjà passée est réalisé, jamais un chiffre hypothétique', () => {
    const result = computeStructureRevenueForecast([makeFee({ negotiationStatus: 'CONTRACTUALISEE' })], CURRENT_YEAR - 1);
    expect(result.lines[0].category).toBe('REALISE');
  });

  it('un frais CONTRACTUALISEE dont l\'année est à venir reste contractualisé, pas réalisé', () => {
    const result = computeStructureRevenueForecast([makeFee({ negotiationStatus: 'CONTRACTUALISEE' })], CURRENT_YEAR + 1);
    expect(result.lines[0].category).toBe('CONTRACTUALISE');
  });

  it('exclut un frais dont l\'année demandée est hors de startYear/endYear', () => {
    const result = computeStructureRevenueForecast([makeFee({ startYear: 2030, endYear: 2035 })], CURRENT_YEAR);
    expect(result.lines).toHaveLength(0);
  });

  it("un frais au taux sans montant fixe n'est jamais estimé au hasard — amountEur reste null, compté à part (Unknown ≠ Zero)", () => {
    const result = computeStructureRevenueForecast([makeFee({ fixedAmount: null, ratePct: 2.5 })], CURRENT_YEAR - 1);
    expect(result.lines[0].amountEur).toBeNull();
    expect(result.unquantifiedCount).toBe(1);
    expect(result.totalsByCategory.REALISE).toBe(0);
  });

  it('additionne plusieurs frais quantifiés de la même catégorie', () => {
    const fees = [
      makeFee({ id: 'f1', fixedAmount: 5000, negotiationStatus: 'PROPOSEE' }),
      makeFee({ id: 'f2', fixedAmount: 7000, negotiationStatus: 'PROPOSEE' }),
    ];
    const result = computeStructureRevenueForecast(fees, CURRENT_YEAR);
    expect(result.totalsByCategory.PROPOSE).toBe(12000);
  });
});
