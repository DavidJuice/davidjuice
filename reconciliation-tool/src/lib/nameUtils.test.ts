import { describe, it, expect } from 'vitest';
import { normalizeName, buildDisplayName, namesMatch } from './nameUtils';

describe('normalizeName', () => {
  it('normalizes a basic English name', () => {
    const result = normalizeName('John', 'Michael', 'Smith');
    expect(result.firstOnly).toBe('john');
    expect(result.middle).toBe('michael');
    expect(result.fullFirst).toBe('johnmichael');
    expect(result.last).toBe('smith');
  });

  it('handles Korean name split by SSA (first name has space)', () => {
    // "Eun Hee" was originally one first name, but SSA split it
    const result = normalizeName('Eun Hee', '', 'Kim');
    expect(result.firstOnly).toBe('eun');
    expect(result.middle).toBe('hee');
    expect(result.fullFirst).toBe('eunhee');
    expect(result.last).toBe('kim');
  });

  it('handles Korean name with middle name in separate field', () => {
    const result = normalizeName('Eun', 'Hee', 'Kim');
    expect(result.firstOnly).toBe('eun');
    expect(result.middle).toBe('hee');
    expect(result.fullFirst).toBe('eunhee');
    expect(result.last).toBe('kim');
  });

  it('handles name with no middle name', () => {
    const result = normalizeName('Eun', '', 'Kim');
    expect(result.firstOnly).toBe('eun');
    expect(result.middle).toBe('');
    expect(result.fullFirst).toBe('eun');
    expect(result.last).toBe('kim');
  });

  it('handles empty/null-like inputs gracefully', () => {
    const result = normalizeName('', '', '');
    expect(result.firstOnly).toBe('');
    expect(result.middle).toBe('');
    expect(result.last).toBe('');
  });

  it('trims whitespace', () => {
    const result = normalizeName('  John  ', '  ', '  Smith  ');
    expect(result.firstOnly).toBe('john');
    expect(result.last).toBe('smith');
  });

  it('removes special characters but keeps Korean', () => {
    const result = normalizeName('은희', '', '김');
    expect(result.firstOnly).toBe('은희');
    expect(result.last).toBe('김');
  });

  it('preserves display names with original casing', () => {
    const result = normalizeName('Eun Hee', '', 'Kim');
    expect(result.display.firstName).toBe('Eun Hee');
    expect(result.display.lastName).toBe('Kim');
  });
});

describe('buildDisplayName', () => {
  it('joins first, middle, and last', () => {
    expect(buildDisplayName('Eun', 'Hee', 'Kim')).toBe('Eun Hee Kim');
  });

  it('skips empty middle', () => {
    expect(buildDisplayName('John', '', 'Smith')).toBe('John Smith');
  });
});

describe('namesMatch', () => {
  it('matches with middle name when includeMiddleName is true', () => {
    const a = normalizeName('Eun', 'Hee', 'Kim');
    const b = normalizeName('Eun', 'Hee', 'Kim');
    expect(namesMatch(a, b, true)).toBe(true);
  });

  it('does not match different middle names when includeMiddleName is true', () => {
    const a = normalizeName('Eun', 'Hee', 'Kim');
    const b = normalizeName('Eun', 'Jung', 'Kim');
    expect(namesMatch(a, b, true)).toBe(false);
  });

  it('matches regardless of middle name when includeMiddleName is false', () => {
    const a = normalizeName('Eun', 'Hee', 'Kim');
    const b = normalizeName('Eun', 'Jung', 'Kim');
    expect(namesMatch(a, b, false)).toBe(true);
  });

  it('matches split Korean name with combined Korean name', () => {
    // Source A has "Eun" as first and "Hee" as middle
    const a = normalizeName('Eun', 'Hee', 'Kim');
    // Source B has "Eun Hee" as first (no middle)
    const b = normalizeName('Eun Hee', '', 'Kim');
    // With middle name included, both produce fullFirst="eunhee"
    expect(namesMatch(a, b, true)).toBe(true);
  });
});
