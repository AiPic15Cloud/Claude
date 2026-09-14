import { computeDataRoomCompleteness, DATA_ROOM_BLOCKS, type DataRoomBlockKey, type DataRoomItemStatusLike } from './data-room-completeness.util';

describe('computeDataRoomCompleteness', () => {
  it('treats a data room with no recorded statuses as 0% complete, all items MISSING', () => {
    const result = computeDataRoomCompleteness([]);

    expect(result.overallCompletenessPct).toBe(0);
    for (const block of result.blocks) {
      expect(block.completenessPct).toBe(0);
      expect(block.obtainedCount).toBe(0);
      expect(block.missingCount).toBe(block.total);
    }

    const expectedMissingCount = (Object.keys(DATA_ROOM_BLOCKS) as DataRoomBlockKey[]).reduce((sum, key) => sum + DATA_ROOM_BLOCKS[key].items.length, 0);
    expect(result.missingItems).toHaveLength(expectedMissingCount);
    expect(result.inconsistentItems).toHaveLength(0);
  });

  it('marks a fully-obtained block as 100% complete', () => {
    const statuses: DataRoomItemStatusLike[] = DATA_ROOM_BLOCKS.CORPORATE_KYC.items.map((item) => ({
      block: 'CORPORATE_KYC',
      itemKey: item.itemKey,
      status: 'OBTAINED',
    }));

    const result = computeDataRoomCompleteness(statuses);
    const block = result.blocks.find((b) => b.block === 'CORPORATE_KYC')!;

    expect(block.completenessPct).toBe(100);
    expect(block.obtainedCount).toBe(DATA_ROOM_BLOCKS.CORPORATE_KYC.items.length);
    expect(block.missingCount).toBe(0);
  });

  it('excludes NOT_APPLICABLE items from the completeness denominator', () => {
    const items = DATA_ROOM_BLOCKS.ENVIRONMENTAL_ESG.items;
    const statuses: DataRoomItemStatusLike[] = [
      { block: 'ENVIRONMENTAL_ESG', itemKey: items[0].itemKey, status: 'OBTAINED' },
      { block: 'ENVIRONMENTAL_ESG', itemKey: items[1].itemKey, status: 'NOT_APPLICABLE' },
      ...items.slice(2).map((item) => ({ block: 'ENVIRONMENTAL_ESG' as const, itemKey: item.itemKey, status: 'OBTAINED' as const })),
    ];

    const result = computeDataRoomCompleteness(statuses);
    const block = result.blocks.find((b) => b.block === 'ENVIRONMENTAL_ESG')!;

    // 4 obtained out of (5 total - 1 not-applicable) = 4/4 = 100%, not 4/5.
    expect(block.notApplicableCount).toBe(1);
    expect(block.completenessPct).toBe(100);
  });

  it('a block with every item NOT_APPLICABLE is trivially 100% complete, not a divide-by-zero', () => {
    const statuses: DataRoomItemStatusLike[] = DATA_ROOM_BLOCKS.MARKET.items.map((item) => ({
      block: 'MARKET',
      itemKey: item.itemKey,
      status: 'NOT_APPLICABLE',
    }));

    const result = computeDataRoomCompleteness(statuses);
    const block = result.blocks.find((b) => b.block === 'MARKET')!;

    expect(block.notApplicableCount).toBe(DATA_ROOM_BLOCKS.MARKET.items.length);
    expect(block.completenessPct).toBe(100);
  });

  it('flags INCONSISTENT items separately from MISSING, carrying notes through', () => {
    const items = DATA_ROOM_BLOCKS.LEASES.items;
    const statuses: DataRoomItemStatusLike[] = [{ block: 'LEASES', itemKey: items[0].itemKey, status: 'INCONSISTENT', notes: 'Loyer facial ne correspond pas au bail signé' }];

    const result = computeDataRoomCompleteness(statuses);

    expect(result.inconsistentItems).toHaveLength(1);
    expect(result.inconsistentItems[0].itemKey).toBe(items[0].itemKey);
    expect(result.inconsistentItems[0].notes).toBe('Loyer facial ne correspond pas au bail signé');
    expect(result.missingItems.some((i) => i.itemKey === items[0].itemKey && i.block === 'LEASES')).toBe(false);
  });

  it('computes overall completeness as a weighted aggregate across blocks, not a simple average of percentages', () => {
    // CORPORATE_KYC has 5 items, obtain all of them. LEASES has 6 items, obtain none.
    // Weighted: 5 obtained / (5 + 6) applicable = 45%, not (100% + 0%) / 2 = 50%.
    const statuses: DataRoomItemStatusLike[] = DATA_ROOM_BLOCKS.CORPORATE_KYC.items.map((item) => ({
      block: 'CORPORATE_KYC',
      itemKey: item.itemKey,
      status: 'OBTAINED',
    }));

    const result = computeDataRoomCompleteness(statuses);
    const otherBlocksTotal = (Object.keys(DATA_ROOM_BLOCKS) as DataRoomBlockKey[])
      .filter((k) => k !== 'CORPORATE_KYC')
      .reduce((sum, k) => sum + DATA_ROOM_BLOCKS[k].items.length, 0);
    const expectedPct = Math.round((DATA_ROOM_BLOCKS.CORPORATE_KYC.items.length / (DATA_ROOM_BLOCKS.CORPORATE_KYC.items.length + otherBlocksTotal)) * 100);

    expect(result.overallCompletenessPct).toBe(expectedPct);
  });

  it('an item with an unrecorded status defaults to MISSING, never OBTAINED (Unknown != Zero)', () => {
    const result = computeDataRoomCompleteness([]);
    const item = result.blocks.find((b) => b.block === 'TITLE_LEGAL')!.items.find((i) => i.itemKey === 'titrePropriete')!;

    expect(item.status).toBe('MISSING');
  });
});
