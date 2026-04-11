import { describe, it, expect } from 'vitest';
import { buildIdentifier, shouldIncludeMiddleName, detectCollisions } from './identifierBuilder';
import type { UnifiedRecord } from '../types';

function makeRecord(overrides: Partial<UnifiedRecord> = {}): UnifiedRecord {
  return {
    firstName: 'Eun',
    middleName: 'Hee',
    lastName: 'Kim',
    dob: '01/15/1990',
    ssn: '',
    phone: '(206) 555-1234',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '98101',
    policyNumber: '',
    carrier: '',
    plan: '',
    effectiveDate: '',
    terminationDate: '',
    status: '',
    premium: '',
    _source: 'ab_policy',
    _rawRow: {},
    ...overrides,
  };
}

describe('buildIdentifier', () => {
  it('builds level 1 key with middle name', () => {
    const record = makeRecord();
    const key = buildIdentifier(record, 1, true);
    expect(key).toBe('eunhee|kim|1990-01-15');
  });

  it('builds level 1 key without middle name', () => {
    const record = makeRecord();
    const key = buildIdentifier(record, 1, false);
    expect(key).toBe('eun|kim|1990-01-15');
  });

  it('builds level 2 key with phone', () => {
    const record = makeRecord();
    const key = buildIdentifier(record, 2, true);
    expect(key).toBe('eunhee|kim|1990-01-15|2065551234');
  });

  it('builds level 3 key with zip', () => {
    const record = makeRecord();
    const key = buildIdentifier(record, 3, true);
    expect(key).toBe('eunhee|kim|1990-01-15|2065551234|98101');
  });

  it('normalizes phone (strips non-digits, last 10)', () => {
    const record = makeRecord({ phone: '+1 (206) 555-1234' });
    const key = buildIdentifier(record, 2, false);
    expect(key).toContain('2065551234');
  });

  it('normalizes zip (first 5 digits)', () => {
    const record = makeRecord({ zip: '98101-4567' });
    const key = buildIdentifier(record, 3, false);
    expect(key).toContain('98101');
  });
});

describe('shouldIncludeMiddleName', () => {
  it('returns true if all sources have middle name', () => {
    const sources = new Set(['ab_policy', 'humana_bob']);
    expect(shouldIncludeMiddleName(sources, ['ab_policy', 'humana_bob'])).toBe(true);
  });

  it('returns false if any source lacks middle name', () => {
    const sources = new Set(['ab_policy']);
    expect(shouldIncludeMiddleName(sources, ['ab_policy', 'humana_bob'])).toBe(false);
  });
});

describe('detectCollisions', () => {
  it('detects duplicate keys at level 1', () => {
    const records = [
      makeRecord({ firstName: 'Eun', middleName: 'Hee', lastName: 'Kim', dob: '01/15/1990', phone: '111' }),
      makeRecord({ firstName: 'Eun', middleName: 'Hee', lastName: 'Kim', dob: '01/15/1990', phone: '222' }),
      makeRecord({ firstName: 'John', middleName: '', lastName: 'Smith', dob: '02/20/1985' }),
    ];

    const groups = detectCollisions(records, 1, true);
    // "Eun Hee Kim" should be grouped together
    let hasDuplicate = false;
    for (const group of groups.values()) {
      if (group.length > 1) hasDuplicate = true;
    }
    expect(hasDuplicate).toBe(true);
    expect(groups.size).toBe(2);
  });

  it('resolves duplicates at level 2 with phone', () => {
    const records = [
      makeRecord({ phone: '(206) 555-1111' }),
      makeRecord({ phone: '(206) 555-2222' }),
    ];

    const groups = detectCollisions(records, 2, true);
    // Different phones should split them
    expect(groups.size).toBe(2);
    for (const group of groups.values()) {
      expect(group.length).toBe(1);
    }
  });
});
