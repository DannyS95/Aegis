import { filterForValidStrings } from './string-list.util';

describe('filterForValidStrings', () => {
  it('trims whitespace and removes empty entries', () => {
    const result = filterForValidStrings([
      '  alpha ',
      ' ',
      '',
      '\tbeta\t',
      null,
      undefined,
    ]);
    expect(result).toEqual(['alpha', 'beta']);
  });

  it('returns an empty array when no values remain after filtering', () => {
    const result = filterForValidStrings(['  ', '', null]);
    expect(result).toEqual([]);
  });

  it('preserves already clean strings', () => {
    const result = filterForValidStrings(['one', 'two']);
    expect(result).toEqual(['one', 'two']);
  });
});
