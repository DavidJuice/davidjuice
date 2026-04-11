import { normalizeName } from './nameUtils';
import { normalizeDate } from './dateUtils';
import type { UnifiedRecord } from '../types';

/**
 * Build a composite identifier for matching records across data sources.
 *
 * Middle name inclusion rule (global, not per-record):
 * - If ALL sources have middle name data: identifier includes middleName
 * - If ANY source lacks middle name data: identifier excludes middleName globally
 *
 * Escalation levels (per collision group):
 * - Level 1: name + DOB
 * - Level 2: Level 1 + phone
 * - Level 3: Level 2 + zip
 */

export type EscalationLevel = 1 | 2 | 3;

export function buildIdentifier(
  record: UnifiedRecord,
  level: EscalationLevel,
  includeMiddleName: boolean
): string {
  const name = normalizeName(record.firstName, record.middleName, record.lastName);
  const namePart = includeMiddleName ? name.fullFirst : name.firstOnly;
  const dob = normalizeDate(record.dob);

  let key = `${namePart}|${name.last}|${dob}`;

  if (level >= 2) {
    key += `|${normalizePhone(record.phone)}`;
  }

  if (level >= 3) {
    key += `|${normalizeZip(record.zip)}`;
  }

  return key;
}

/**
 * Check whether ALL sources have a middle name column with data.
 * This determines the global includeMiddleName flag.
 */
export function shouldIncludeMiddleName(
  sourcesWithMiddleName: Set<string>,
  allSources: string[]
): boolean {
  return allSources.every(source => sourcesWithMiddleName.has(source));
}

/**
 * Detect collision groups at a given level and return records that need escalation.
 * Returns a map of identifier -> array of records sharing that identifier.
 */
export function detectCollisions(
  records: UnifiedRecord[],
  level: EscalationLevel,
  includeMiddleName: boolean
): Map<string, UnifiedRecord[]> {
  const groups = new Map<string, UnifiedRecord[]>();

  for (const record of records) {
    const key = buildIdentifier(record, level, includeMiddleName);
    const group = groups.get(key);
    if (group) {
      group.push(record);
    } else {
      groups.set(key, [record]);
    }
  }

  return groups;
}

/**
 * Build an index of records with automatic escalation for duplicate keys.
 * Returns a map where each key maps to exactly one record (after escalation).
 */
export function buildRecordIndex(
  records: UnifiedRecord[],
  includeMiddleName: boolean
): { index: Map<string, UnifiedRecord>; level: Map<string, EscalationLevel> } {
  const index = new Map<string, UnifiedRecord>();
  const levelMap = new Map<string, EscalationLevel>();

  // Start at level 1
  const level1Groups = detectCollisions(records, 1, includeMiddleName);

  for (const [key, group] of level1Groups) {
    if (group.length === 1) {
      index.set(key, group[0]);
      levelMap.set(key, 1);
    } else {
      // Escalate to level 2
      const level2Groups = detectCollisions(group, 2, includeMiddleName);
      for (const [key2, group2] of level2Groups) {
        if (group2.length === 1) {
          index.set(key2, group2[0]);
          levelMap.set(key2, 2);
        } else {
          // Escalate to level 3
          const level3Groups = detectCollisions(group2, 3, includeMiddleName);
          for (const [key3, group3] of level3Groups) {
            // At level 3, take the first record if still duplicates
            index.set(key3, group3[0]);
            levelMap.set(key3, 3);
          }
        }
      }
    }
  }

  return { index, level: levelMap };
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

function normalizeZip(zip: string): string {
  if (!zip) return '';
  return zip.replace(/\D/g, '').slice(0, 5);
}
