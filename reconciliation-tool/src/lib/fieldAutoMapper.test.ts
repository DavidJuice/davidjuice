import { describe, it, expect } from 'vitest';
import { autoMapFields } from './fieldAutoMapper';
import { IGNORE_FIELD } from '../constants/fieldMappings';

describe('autoMapFields', () => {
  it('maps exact alias matches with confidence 1.0', () => {
    const headers = ['First Name', 'Last Name', 'Date of Birth', 'Phone Number'];
    const mappings = autoMapFields(headers);

    expect(mappings[0].canonicalField).toBe('firstName');
    expect(mappings[0].confidence).toBe(1.0);

    expect(mappings[1].canonicalField).toBe('lastName');
    expect(mappings[1].confidence).toBe(1.0);

    expect(mappings[2].canonicalField).toBe('dob');
    expect(mappings[2].confidence).toBe(1.0);

    expect(mappings[3].canonicalField).toBe('phone');
    expect(mappings[3].confidence).toBe(1.0);
  });

  it('maps common insurance field names', () => {
    const headers = [
      'Member First Name',
      'Member Last Name',
      'Member DOB',
      'Policy Number',
      'Effective Date',
      'Premium Amount',
      'Coverage Status',
    ];
    const mappings = autoMapFields(headers);

    expect(mappings[0].canonicalField).toBe('firstName');
    expect(mappings[1].canonicalField).toBe('lastName');
    expect(mappings[2].canonicalField).toBe('dob');
    expect(mappings[3].canonicalField).toBe('policyNumber');
    expect(mappings[4].canonicalField).toBe('effectiveDate');
    expect(mappings[5].canonicalField).toBe('premium');
    expect(mappings[6].canonicalField).toBe('status');
  });

  it('marks unknown headers as ignored', () => {
    const headers = ['Random Column XYZ123'];
    const mappings = autoMapFields(headers);
    expect(mappings[0].canonicalField).toBe(IGNORE_FIELD);
    expect(mappings[0].confidence).toBe(0);
  });

  it('handles fuzzy matches for close variations', () => {
    const headers = ['First Nme', 'Last Nme']; // typos
    const mappings = autoMapFields(headers);

    // These should fuzzy match with decent confidence
    // "first nme" vs "first name" => close enough
    expect(mappings[0].confidence).toBeGreaterThan(0.6);
    expect(mappings[1].confidence).toBeGreaterThan(0.6);
  });

  it('handles mixed case headers', () => {
    const headers = ['FIRST NAME', 'last name', 'Date Of Birth'];
    const mappings = autoMapFields(headers);

    expect(mappings[0].canonicalField).toBe('firstName');
    expect(mappings[1].canonicalField).toBe('lastName');
    expect(mappings[2].canonicalField).toBe('dob');
  });
});
