import { parseCsvLines, parseRentRollCsv } from './rent-roll-import.util';

describe('parseCsvLines', () => {
  it('splits quoted fields containing the delimiter', () => {
    const rows = parseCsvLines('a,"b,c",d\n1,2,3', ',');
    expect(rows).toEqual([
      ['a', 'b,c', 'd'],
      ['1', '2', '3'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    const rows = parseCsvLines('name\n"Le ""Parc"" 149"', ',');
    expect(rows).toEqual([['name'], ['Le "Parc" 149']]);
  });

  it('handles CRLF line endings', () => {
    const rows = parseCsvLines('a,b\r\n1,2\r\n', ',');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

const HEADER = 'tenantName,lotLabel,surfaceM2,dateEffet,dateTerme,loyerFacialAnnuel,indexation,franchiseMois,depotGarantieMontant,statutRenouvellement,impayesNotes';

describe('parseRentRollCsv', () => {
  it('parses a valid row with all fields', () => {
    const csv = `${HEADER}\nBoulangerie Martin,Lot 1,85.5,2024-01-01,2033-12-31,42000,ILC,1,3500,SIGNE,`;
    const { rows, errors } = parseRentRollCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].data).toMatchObject({
      tenantName: 'Boulangerie Martin',
      lotLabel: 'Lot 1',
      surfaceM2: 85.5,
      loyerFacialAnnuel: 42000,
      indexation: 'ILC',
      statutRenouvellement: 'SIGNE',
    });
  });

  it('parses required-only columns', () => {
    const csv = 'tenantName,dateEffet,dateTerme,loyerFacialAnnuel\nLocataire X,01/06/2024,31/05/2033,18000';
    const { rows, errors } = parseRentRollCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].data.dateEffet.startsWith('2024-06-01')).toBe(true);
  });

  it('rejects a file missing required columns', () => {
    const csv = 'tenantName,loyerFacialAnnuel\nX,1000';
    const { rows, errors } = parseRentRollCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0].message).toContain('dateEffet');
  });

  it('reports a per-row error without failing the whole batch', () => {
    const csv = `${HEADER}\n,Lot 1,,2024-01-01,2033-12-31,42000,,,,,\nLocataire Bon,,,2024-01-01,2033-12-31,42000,,,,,`;
    const { rows, errors } = parseRentRollCsv(csv);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(2);
    expect(rows).toHaveLength(1);
    expect(rows[0].data.tenantName).toBe('Locataire Bon');
  });

  it('rejects an invalid date', () => {
    const csv = `${HEADER}\nX,,,not-a-date,2033-12-31,42000,,,,,`;
    const { errors } = parseRentRollCsv(csv);
    expect(errors[0].message).toContain('dateEffet invalide');
  });

  it('rejects an unknown indexation type', () => {
    const csv = `${HEADER}\nX,,,2024-01-01,2033-12-31,42000,BOGUS,,,,`;
    const { errors } = parseRentRollCsv(csv);
    expect(errors[0].message).toContain('indexation inconnue');
  });

  it('supports semicolon-delimited exports and comma decimal separators', () => {
    const csv = `tenantName;dateEffet;dateTerme;loyerFacialAnnuel;surfaceM2\nLocataire FR;01/01/2024;31/12/2033;42000;85,5`;
    const { rows, errors } = parseRentRollCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].data.surfaceM2).toBe(85.5);
  });

  it('skips blank trailing lines', () => {
    const csv = `${HEADER}\nX,,,2024-01-01,2033-12-31,42000,,,,,\n\n`;
    const { rows, errors } = parseRentRollCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });
});
