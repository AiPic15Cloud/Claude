import { computeLegalTaxDdSummary, LEGAL_TAX_BLOCKS, type LegalTaxBlockKey, type LegalTaxItemStatusLike } from './legal-tax-dd.util';

describe('computeLegalTaxDdSummary', () => {
  it('treats an item with no recorded status as NON_CONTROLE by default (Unknown != Zero)', () => {
    const result = computeLegalTaxDdSummary([]);

    for (const block of result.blocks) {
      expect(block.nonControleCount).toBe(block.total);
      expect(block.conformeCount).toBe(0);
      expect(block.reserveCount).toBe(0);
      for (const item of block.items) {
        expect(item.status).toBe('NON_CONTROLE');
      }
    }
    expect(result.validationNeeded).toHaveLength(0);
  });

  it('marks a fully CONFORME block correctly, no validation needed', () => {
    const statuses: LegalTaxItemStatusLike[] = LEGAL_TAX_BLOCKS.URBANISME.items.map((item) => ({
      block: 'URBANISME',
      itemKey: item.itemKey,
      status: 'CONFORME',
    }));

    const result = computeLegalTaxDdSummary(statuses);
    const block = result.blocks.find((b) => b.block === 'URBANISME')!;

    expect(block.conformeCount).toBe(LEGAL_TAX_BLOCKS.URBANISME.items.length);
    expect(block.nonControleCount).toBe(0);
    expect(result.validationNeeded).toHaveLength(0);
  });

  it('a RESERVE item surfaces in validationNeeded with its required professional and notes', () => {
    const statuses: LegalTaxItemStatusLike[] = [{ block: 'FISCALITE_VEHICULE', itemKey: 'regimeIs', status: 'RESERVE', notes: 'Montage à revalider suite changement de structure' }];

    const result = computeLegalTaxDdSummary(statuses);

    expect(result.validationNeeded).toHaveLength(1);
    expect(result.validationNeeded[0]).toMatchObject({
      block: 'FISCALITE_VEHICULE',
      itemKey: 'regimeIs',
      professional: 'FISCALISTE',
      notes: 'Montage à revalider suite changement de structure',
    });
  });

  it('counts NON_CONTROLE, CONFORME and RESERVE separately per block, never merged', () => {
    const statuses: LegalTaxItemStatusLike[] = [
      { block: 'CONTENTIEUX', itemKey: 'contentieuxActif', status: 'RESERVE', notes: 'Litige voisinage en cours' },
      { block: 'CONTENTIEUX', itemKey: 'contentieuxProprietaire', status: 'CONFORME' },
    ];

    const result = computeLegalTaxDdSummary(statuses);
    const block = result.blocks.find((b) => b.block === 'CONTENTIEUX')!;

    expect(block.reserveCount).toBe(1);
    expect(block.conformeCount).toBe(1);
    expect(block.nonControleCount).toBe(LEGAL_TAX_BLOCKS.CONTENTIEUX.items.length - 2);
  });

  it('aggregates validationNeeded across all blocks, not just one', () => {
    const statuses: LegalTaxItemStatusLike[] = [
      { block: 'URBANISME', itemKey: 'permis', status: 'RESERVE' },
      { block: 'CONTENTIEUX', itemKey: 'contentieuxLocataires', status: 'RESERVE' },
    ];

    const result = computeLegalTaxDdSummary(statuses);

    expect(result.validationNeeded).toHaveLength(2);
    const blocksFlagged = result.validationNeeded.map((v) => v.block).sort();
    expect(blocksFlagged).toEqual(['CONTENTIEUX', 'URBANISME'] as LegalTaxBlockKey[]);
  });

  it('returns all 3 closed-registry blocks even with no statuses recorded', () => {
    const result = computeLegalTaxDdSummary([]);
    const blockKeys = result.blocks.map((b) => b.block).sort();
    expect(blockKeys).toEqual((Object.keys(LEGAL_TAX_BLOCKS) as LegalTaxBlockKey[]).sort());
  });
});
