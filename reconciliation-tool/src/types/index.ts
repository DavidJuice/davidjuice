export type SourceType =
  | 'ab_policy'
  | 'ab_individual'
  | 'humana_bob'
  | 'uhc_bob'
  | 'uhc_ocr';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  sourceType: SourceType;
  rawData: ArrayBuffer;
  parsedAt?: number;
}

export interface ParsedSource {
  sourceType: SourceType;
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export interface FieldMapping {
  sourceColumn: string;
  canonicalField: string;
  confidence: number;
  isManual: boolean;
}

export interface SourceMappings {
  sourceType: SourceType;
  mappings: FieldMapping[];
}

export interface UnifiedRecord {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  ssn: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  policyNumber: string;
  carrier: string;
  plan: string;
  effectiveDate: string;
  terminationDate: string;
  status: string;
  premium: string;
  _source: SourceType;
  _rawRow: Record<string, string>;
  [key: string]: string | SourceType | Record<string, string>;
}

export const CANONICAL_FIELDS: { key: keyof UnifiedRecord; label: string; category: string }[] = [
  { key: 'firstName', label: 'First Name', category: 'Identity' },
  { key: 'middleName', label: 'Middle Name', category: 'Identity' },
  { key: 'lastName', label: 'Last Name', category: 'Identity' },
  { key: 'dob', label: 'Date of Birth', category: 'Identity' },
  { key: 'ssn', label: 'SSN (Last 4)', category: 'Identity' },
  { key: 'phone', label: 'Phone', category: 'Contact' },
  { key: 'email', label: 'Email', category: 'Contact' },
  { key: 'address', label: 'Address', category: 'Contact' },
  { key: 'city', label: 'City', category: 'Contact' },
  { key: 'state', label: 'State', category: 'Contact' },
  { key: 'zip', label: 'Zip Code', category: 'Contact' },
  { key: 'policyNumber', label: 'Policy Number', category: 'Policy' },
  { key: 'carrier', label: 'Carrier', category: 'Policy' },
  { key: 'plan', label: 'Plan Name', category: 'Policy' },
  { key: 'effectiveDate', label: 'Effective Date', category: 'Policy' },
  { key: 'terminationDate', label: 'Termination Date', category: 'Policy' },
  { key: 'status', label: 'Status', category: 'Policy' },
  { key: 'premium', label: 'Premium', category: 'Policy' },
];
