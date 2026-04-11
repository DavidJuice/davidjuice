import { buildIdentifier } from './identifierBuilder';
import { compareDatesDesc } from './dateUtils';
import type { UnifiedRecord } from '../types';

/**
 * Extract the most recent record per person from Humana's log history format.
 *
 * Humana BOB is a log/history format where multiple rows exist per person,
 * each representing a change event with a date. We need to:
 * 1. Group records by person identifier
 * 2. Sort each group by the date column (descending)
 * 3. Return only the most recent record per person
 */
export function extractMostRecent(
  records: UnifiedRecord[],
  dateField: string,
  includeMiddleName: boolean
): UnifiedRecord[] {
  if (records.length === 0) return [];

  // Group by person identifier (level 1)
  const groups = new Map<string, UnifiedRecord[]>();

  for (const record of records) {
    const key = buildIdentifier(record, 1, includeMiddleName);
    const group = groups.get(key);
    if (group) {
      group.push(record);
    } else {
      groups.set(key, [record]);
    }
  }

  // For each group, sort by date descending and take the first (most recent)
  const result: UnifiedRecord[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      group.sort((a, b) => {
        const dateA = getDateValue(a, dateField);
        const dateB = getDateValue(b, dateField);
        return compareDatesDesc(dateA, dateB);
      });
      result.push(group[0]);
    }
  }

  return result;
}

/**
 * Get the date value from a record, checking both the unified field
 * and the raw row data.
 */
function getDateValue(record: UnifiedRecord, dateField: string): string {
  // Check unified fields first
  const unifiedValue = record[dateField];
  if (typeof unifiedValue === 'string' && unifiedValue) {
    return unifiedValue;
  }

  // Fall back to raw row data
  if (record._rawRow && record._rawRow[dateField]) {
    return record._rawRow[dateField];
  }

  return '';
}
