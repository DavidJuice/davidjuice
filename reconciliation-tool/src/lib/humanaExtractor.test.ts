import { describe, it, expect } from 'vitest';
import { extractMostRecent } from './humanaExtractor';
import type { UnifiedRecord } from '../types';

function makeRecord(overrides: Partial<UnifiedRecord> = {}): UnifiedRecord {
  return {
    firstName: 'Eun',
    middleName: 'Hee',
    lastName: 'Kim',
    dob: '01/15/1990',
    ssn: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    policyNumber: 'P001',
    carrier: 'Humana',
    plan: 'Gold',
    effectiveDate: '01/01/2024',
    terminationDate: '',
    status: 'Active',
    premium: '350',
    _source: 'humana_bob',
    _rawRow: {},
    ...overrides,
  };
}

describe('extractMostRecent', () => {
  it('returns the most recent record per person', () => {
    const records = [
      makeRecord({ effectiveDate: '01/01/2023', status: 'Active', premium: '300' }),
      makeRecord({ effectiveDate: '06/01/2023', status: 'Active', premium: '325' }),
      makeRecord({ effectiveDate: '01/01/2024', status: 'Active', premium: '350' }),
    ];

    const result = extractMostRecent(records, 'effectiveDate', true);
    expect(result).toHaveLength(1);
    expect(result[0].premium).toBe('350');
    expect(result[0].effectiveDate).toBe('01/01/2024');
  });

  it('handles multiple persons', () => {
    const records = [
      makeRecord({ firstName: 'Eun', lastName: 'Kim', effectiveDate: '01/01/2024' }),
      makeRecord({ firstName: 'Eun', lastName: 'Kim', effectiveDate: '06/01/2023' }),
      makeRecord({ firstName: 'John', lastName: 'Smith', dob: '02/20/1985', effectiveDate: '03/01/2024' }),
      makeRecord({ firstName: 'John', lastName: 'Smith', dob: '02/20/1985', effectiveDate: '01/01/2023' }),
    ];

    const result = extractMostRecent(records, 'effectiveDate', true);
    expect(result).toHaveLength(2);
  });

  it('handles single record per person', () => {
    const records = [
      makeRecord({ firstName: 'Eun', lastName: 'Kim', effectiveDate: '01/01/2024' }),
    ];

    const result = extractMostRecent(records, 'effectiveDate', true);
    expect(result).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    const result = extractMostRecent([], 'effectiveDate', true);
    expect(result).toHaveLength(0);
  });
});
