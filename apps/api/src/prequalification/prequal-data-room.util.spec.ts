import { suggestDataRoomBlocks, type PrequalDataRoomInput } from './prequal-data-room.util';

function input(overrides: Partial<PrequalDataRoomInput> = {}): PrequalDataRoomInput {
  return {
    worksDescription: null,
    createdSurfaceSqm: null,
    projectType: null,
    lotCount: null,
    acquisitionStatus: null,
    salesLotsCount: 0,
    interimRevenueNote: null,
    otherRevenueRetained: null,
    externalFinancingsCount: 0,
    ...overrides,
  };
}

describe('suggestDataRoomBlocks', () => {
  it('suggère toujours le bloc identité, même sans aucune autre donnée', () => {
    const suggestions = suggestDataRoomBlocks(input());
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].block).toBe('identite');
  });

  it('ne suggère jamais les 8 blocs conditionnels par défaut (doctrine anti-liste générique)', () => {
    const suggestions = suggestDataRoomBlocks(input());
    expect(suggestions.length).toBeLessThan(9);
  });

  it('suggère le bloc travaux uniquement si des travaux sont décrits', () => {
    expect(suggestDataRoomBlocks(input()).some((s) => s.block === 'travaux')).toBe(false);
    expect(suggestDataRoomBlocks(input({ worksDescription: 'Rénovation toiture' })).some((s) => s.block === 'travaux')).toBe(true);
  });

  it('suggère le bloc urbanisme si une surface créée est renseignée', () => {
    expect(suggestDataRoomBlocks(input({ createdSurfaceSqm: 120 })).some((s) => s.block === 'urbanisme')).toBe(true);
  });

  it('suggère le bloc division si plusieurs lots sont prévus', () => {
    expect(suggestDataRoomBlocks(input({ lotCount: 3 })).some((s) => s.block === 'division')).toBe(true);
    expect(suggestDataRoomBlocks(input({ lotCount: 1 })).some((s) => s.block === 'division')).toBe(false);
  });

  it('suggère le bloc commercialisation uniquement si des lots sont déjà saisis', () => {
    expect(suggestDataRoomBlocks(input({ salesLotsCount: 0 })).some((s) => s.block === 'commercialisation')).toBe(false);
    expect(suggestDataRoomBlocks(input({ salesLotsCount: 2 })).some((s) => s.block === 'commercialisation')).toBe(true);
  });

  it('suggère le bloc acquisition conditionnelle uniquement si le foncier n’est pas encore acté', () => {
    expect(suggestDataRoomBlocks(input({ acquisitionStatus: 'PROPRIETE' })).some((s) => s.block === 'acquisition_conditionnelle')).toBe(false);
    expect(suggestDataRoomBlocks(input({ acquisitionStatus: 'PROMESSE' })).some((s) => s.block === 'acquisition_conditionnelle')).toBe(true);
  });

  it('suggère le bloc autres plateformes uniquement si un financement externe est confirmé', () => {
    expect(suggestDataRoomBlocks(input({ externalFinancingsCount: 0 })).some((s) => s.block === 'autres_plateformes')).toBe(false);
    expect(suggestDataRoomBlocks(input({ externalFinancingsCount: 1 })).some((s) => s.block === 'autres_plateformes')).toBe(true);
  });

  it('chaque suggestion porte une raison non vide', () => {
    const suggestions = suggestDataRoomBlocks(input({ worksDescription: 'x', salesLotsCount: 1 }));
    for (const s of suggestions) expect(s.reason.length).toBeGreaterThan(0);
  });
});
