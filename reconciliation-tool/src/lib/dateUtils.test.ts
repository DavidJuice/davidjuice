import { describe, it, expect } from 'vitest';
import { parseDate, normalizeDate, datesMatch, compareDatesDesc } from './dateUtils';

describe('parseDate', () => {
  it('parses MM/DD/YYYY', () => {
    const result = parseDate('01/15/1990');
    expect(result).toEqual({ year: 1990, month: 1, day: 15 });
  });

  it('parses YYYY-MM-DD (ISO)', () => {
    const result = parseDate('1990-01-15');
    expect(result).toEqual({ year: 1990, month: 1, day: 15 });
  });

  it('parses MM-DD-YYYY', () => {
    const result = parseDate('01-15-1990');
    expect(result).toEqual({ year: 1990, month: 1, day: 15 });
  });

  it('parses single-digit month/day M/D/YYYY', () => {
    const result = parseDate('1/5/1990');
    expect(result).toEqual({ year: 1990, month: 1, day: 5 });
  });

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(parseDate('not a date')).toBeNull();
  });
});

describe('normalizeDate', () => {
  it('normalizes MM/DD/YYYY to YYYY-MM-DD', () => {
    expect(normalizeDate('01/15/1990')).toBe('1990-01-15');
  });

  it('normalizes ISO date', () => {
    expect(normalizeDate('1990-01-15')).toBe('1990-01-15');
  });

  it('returns original string for unparseable input', () => {
    expect(normalizeDate('unknown')).toBe('unknown');
  });
});

describe('datesMatch', () => {
  it('matches same date in different formats', () => {
    expect(datesMatch('01/15/1990', '1990-01-15')).toBe(true);
  });

  it('does not match different dates', () => {
    expect(datesMatch('01/15/1990', '01/16/1990')).toBe(false);
  });
});

describe('compareDatesDesc', () => {
  it('returns negative when a is more recent (a sorts first in descending order)', () => {
    expect(compareDatesDesc('2024-01-01', '2023-01-01')).toBeLessThan(0);
  });

  it('returns 0 for same date', () => {
    expect(compareDatesDesc('2024-01-01', '2024-01-01')).toBe(0);
  });
});
