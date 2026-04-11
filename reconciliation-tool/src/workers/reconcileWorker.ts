import type { UnifiedRecord } from '../types';
import type {
  ReconciliationResult,
  Discrepancy,
  MatchConfig,
  Severity,
  ReconcileWorkerMessage,
  ReconcileWorkerResult,
} from '../types/reconciliation';
import { buildIdentifier, buildRecordIndex } from '../lib/identifierBuilder';
import { normalizeDate } from '../lib/dateUtils';
import { buildDisplayName, normalizeName } from '../lib/nameUtils';
import { CANONICAL_FIELDS } from '../types';

let discrepancyCounter = 0;

function nextId(): string {
  return `d-${++discrepancyCounter}`;
}

self.onmessage = (e: MessageEvent<ReconcileWorkerMessage>) => {
  const { bobRecords, abRecords, config } = e.data;
  discrepancyCounter = 0;

  try {
    const result = reconcile(bobRecords, abRecords, config);
    const msg: ReconcileWorkerResult = { type: 'complete', result };
    self.postMessage(msg);
  } catch (err) {
    const msg: ReconcileWorkerResult = {
      type: 'error',
      error: err instanceof Error ? err.message : 'Reconciliation failed',
    };
    self.postMessage(msg);
  }
};

function reconcile(
  bobRecords: UnifiedRecord[],
  abRecords: UnifiedRecord[],
  config: MatchConfig
): ReconciliationResult {
  const discrepancies: Discrepancy[] = [];
  const unmatchedBob: UnifiedRecord[] = [];
  const unmatchedAb: UnifiedRecord[] = [];
  let matchedCount = 0;
  let level1Matches = 0;
  let level2Escalations = 0;
  let level3Escalations = 0;

  // Build index of BOB records (the anchor/reference)
  const { index: bobIndex, level: bobLevels } = buildRecordIndex(
    bobRecords,
    config.includeMiddleName
  );

  // Track which BOB records get matched
  const matchedBobKeys = new Set<string>();

  // Match each AB record to a BOB record
  for (const abRecord of abRecords) {
    let matched = false;

    // Try matching at each escalation level
    for (const level of [1, 2, 3] as const) {
      if (level === 2 && !config.escalateWithPhone) break;
      if (level === 3 && !config.escalateWithZip) break;

      const key = buildIdentifier(abRecord, level, config.includeMiddleName);
      const bobRecord = bobIndex.get(key);

      if (bobRecord) {
        matched = true;
        matchedCount++;
        matchedBobKeys.add(key);

        const bobLevel = bobLevels.get(key) || 1;
        if (bobLevel === 1) level1Matches++;
        else if (bobLevel === 2) level2Escalations++;
        else if (bobLevel === 3) level3Escalations++;

        // Compare fields
        const fieldDiscrepancies = compareFields(bobRecord, abRecord, config.comparisonFields);
        discrepancies.push(...fieldDiscrepancies);
        break;
      }
    }

    if (!matched) {
      unmatchedAb.push(abRecord);
      discrepancies.push({
        id: nextId(),
        type: 'in_ab_not_in_bob',
        clientName: buildDisplayName(abRecord.firstName, abRecord.middleName, abRecord.lastName),
        dob: abRecord.dob,
        abSource: abRecord._source,
        abRecord,
        severity: 'high',
      });
    }
  }

  // Find BOB records with no AB match
  for (const [key, record] of bobIndex) {
    if (!matchedBobKeys.has(key)) {
      unmatchedBob.push(record);
      discrepancies.push({
        id: nextId(),
        type: 'in_bob_not_in_ab',
        clientName: buildDisplayName(record.firstName, record.middleName, record.lastName),
        dob: record.dob,
        bobSource: record._source,
        bobRecord: record,
        severity: 'high',
      });
    }
  }

  // Build summary
  const summaryBySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const summaryByType: Record<string, number> = {
    field_mismatch: 0,
    in_bob_not_in_ab: 0,
    in_ab_not_in_bob: 0,
  };

  for (const d of discrepancies) {
    summaryBySeverity[d.severity]++;
    summaryByType[d.type]++;
  }

  return {
    timestamp: Date.now(),
    totalBobRecords: bobRecords.length,
    totalAbRecords: abRecords.length,
    matchedCount,
    discrepancies,
    unmatchedBob,
    unmatchedAb,
    summaryBySeverity: summaryBySeverity as Record<Severity, number>,
    summaryByType: summaryByType as ReconciliationResult['summaryByType'],
    middleNameIncluded: config.includeMiddleName,
    escalationStats: {
      level1Matches,
      level2Escalations,
      level3Escalations,
    },
  };
}

function compareFields(
  bobRecord: UnifiedRecord,
  abRecord: UnifiedRecord,
  fields: string[]
): Discrepancy[] {
  const results: Discrepancy[] = [];
  const clientName = buildDisplayName(bobRecord.firstName, bobRecord.middleName, bobRecord.lastName);
  const dob = bobRecord.dob;

  for (const field of fields) {
    const bobVal = normalizeFieldValue(field, String(bobRecord[field] || ''));
    const abVal = normalizeFieldValue(field, String(abRecord[field] || ''));

    // Skip empty comparisons (if both are empty, no discrepancy)
    if (!bobVal && !abVal) continue;

    if (bobVal !== abVal) {
      const fieldDef = CANONICAL_FIELDS.find(f => f.key === field);
      results.push({
        id: nextId(),
        type: 'field_mismatch',
        clientName,
        dob,
        field,
        fieldLabel: fieldDef?.label || field,
        bobValue: String(bobRecord[field] || ''),
        abValue: String(abRecord[field] || ''),
        bobSource: bobRecord._source,
        abSource: abRecord._source,
        severity: classifySeverity(field),
        bobRecord,
        abRecord,
      });
    }
  }

  return results;
}

function normalizeFieldValue(field: string, value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  // Normalize dates
  if (field === 'dob' || field === 'effectiveDate' || field === 'terminationDate') {
    return normalizeDate(value);
  }

  // Normalize phone (digits only, last 10)
  if (field === 'phone') {
    return trimmed.replace(/\D/g, '').slice(-10);
  }

  // Normalize zip (first 5 digits)
  if (field === 'zip') {
    return trimmed.replace(/\D/g, '').slice(0, 5);
  }

  // Normalize names
  if (field === 'firstName' || field === 'middleName' || field === 'lastName') {
    const norm = normalizeName(
      field === 'firstName' ? value : '',
      field === 'middleName' ? value : '',
      field === 'lastName' ? value : ''
    );
    if (field === 'firstName') return norm.firstOnly;
    if (field === 'middleName') return norm.middle;
    return norm.last;
  }

  return trimmed;
}

function classifySeverity(field: string): Severity {
  // High: core identity and policy fields
  if (['policyNumber', 'status', 'carrier', 'plan'].includes(field)) return 'high';
  // Medium: dates and financial
  if (['effectiveDate', 'terminationDate', 'premium', 'dob'].includes(field)) return 'medium';
  // Low: contact info
  return 'low';
}
