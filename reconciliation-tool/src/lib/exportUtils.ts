import * as XLSX from 'xlsx';
import type { ReconciliationResult, Discrepancy } from '../types/reconciliation';

/**
 * Generate and download the reconciliation result as an XLSX file.
 * File name format: "reconciliation result YYYY-MM-DD.xlsx"
 */
export function exportToXlsx(result: ReconciliationResult): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['Reconciliation Result Summary'],
    [''],
    ['Generated', new Date(result.timestamp).toLocaleString()],
    [''],
    ['Total BOB Records', result.totalBobRecords],
    ['Total AB Records', result.totalAbRecords],
    ['Matched Records', result.matchedCount],
    ['Total Discrepancies', result.discrepancies.length],
    [''],
    ['Discrepancies by Severity'],
    ['High', result.summaryBySeverity.high || 0],
    ['Medium', result.summaryBySeverity.medium || 0],
    ['Low', result.summaryBySeverity.low || 0],
    [''],
    ['Discrepancies by Type'],
    ['Field Mismatch', result.summaryByType.field_mismatch || 0],
    ['In BOB, Not in AB', result.summaryByType.in_bob_not_in_ab || 0],
    ['In AB, Not in BOB', result.summaryByType.in_ab_not_in_bob || 0],
    [''],
    ['Matching Configuration'],
    ['Middle Name Included', result.middleNameIncluded ? 'Yes' : 'No'],
    ['Level 1 Matches (Name + DOB)', result.escalationStats.level1Matches],
    ['Level 2 Escalations (+ Phone)', result.escalationStats.level2Escalations],
    ['Level 3 Escalations (+ Zip)', result.escalationStats.level3Escalations],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  applyColumnWidths(summarySheet, [30, 20]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 2: All Discrepancies
  const discrepancyRows = result.discrepancies.map(formatDiscrepancyRow);
  const discrepancySheet = XLSX.utils.json_to_sheet(discrepancyRows);
  applyColumnWidths(discrepancySheet, [20, 15, 12, 20, 25, 25, 10, 35]);
  XLSX.utils.book_append_sheet(workbook, discrepancySheet, 'Discrepancies');

  // Sheet 3: Records in BOB but not in AB
  if (result.unmatchedBob.length > 0) {
    const bobOnlyRows = result.unmatchedBob.map(r => ({
      'First Name': r.firstName,
      'Middle Name': r.middleName,
      'Last Name': r.lastName,
      'Date of Birth': r.dob,
      'Policy Number': r.policyNumber,
      'Carrier': r.carrier,
      'Plan': r.plan,
      'Status': r.status,
      'Source': r._source,
      'Action Required': 'Add to AgencyBloc',
    }));
    const bobOnlySheet = XLSX.utils.json_to_sheet(bobOnlyRows);
    XLSX.utils.book_append_sheet(workbook, bobOnlySheet, 'In BOB Not In AB');
  }

  // Sheet 4: Records in AB but not in BOB
  if (result.unmatchedAb.length > 0) {
    const abOnlyRows = result.unmatchedAb.map(r => ({
      'First Name': r.firstName,
      'Middle Name': r.middleName,
      'Last Name': r.lastName,
      'Date of Birth': r.dob,
      'Policy Number': r.policyNumber,
      'Carrier': r.carrier,
      'Plan': r.plan,
      'Status': r.status,
      'Source': r._source,
      'Action Required': 'Verify in AgencyBloc — may be outdated or incorrect',
    }));
    const abOnlySheet = XLSX.utils.json_to_sheet(abOnlyRows);
    XLSX.utils.book_append_sheet(workbook, abOnlySheet, 'In AB Not In BOB');
  }

  // Generate file with date-stamped name
  const dateStr = formatDate(new Date());
  const fileName = `reconciliation result ${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Generate the XLSX as a Blob (for Google Drive upload).
 */
export function exportToBlob(result: ReconciliationResult): { blob: Blob; fileName: string } {
  const workbook = XLSX.utils.book_new();

  // Same sheet generation as above
  const summaryData = buildSummaryData(result);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const discrepancyRows = result.discrepancies.map(formatDiscrepancyRow);
  const discrepancySheet = XLSX.utils.json_to_sheet(discrepancyRows);
  XLSX.utils.book_append_sheet(workbook, discrepancySheet, 'Discrepancies');

  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const dateStr = formatDate(new Date());
  const fileName = `reconciliation result ${dateStr}.xlsx`;

  return { blob, fileName };
}

function formatDiscrepancyRow(d: Discrepancy) {
  return {
    'Client Name': d.clientName,
    'Date of Birth': d.dob,
    'Severity': d.severity.toUpperCase(),
    'Type': formatDiscrepancyType(d.type),
    'Field': d.fieldLabel || d.field || '',
    'BOB Value (Correct)': d.bobValue || '',
    'AB Value (Needs Correction)': d.abValue || '',
    'Source': d.bobSource || '',
    'Action': getActionDescription(d),
  };
}

function formatDiscrepancyType(type: string): string {
  switch (type) {
    case 'field_mismatch': return 'Field Mismatch';
    case 'in_bob_not_in_ab': return 'Missing from AgencyBloc';
    case 'in_ab_not_in_bob': return 'Not in Book of Business';
    default: return type;
  }
}

function getActionDescription(d: Discrepancy): string {
  switch (d.type) {
    case 'field_mismatch':
      return `Update "${d.fieldLabel || d.field}" in AgencyBloc from "${d.abValue}" to "${d.bobValue}"`;
    case 'in_bob_not_in_ab':
      return 'Add this client/policy to AgencyBloc';
    case 'in_ab_not_in_bob':
      return 'Verify this record in AgencyBloc — may be outdated';
    default:
      return '';
  }
}

function buildSummaryData(result: ReconciliationResult): (string | number)[][] {
  return [
    ['Reconciliation Result Summary'],
    [''],
    ['Generated', new Date(result.timestamp).toLocaleString()],
    [''],
    ['Total BOB Records', result.totalBobRecords],
    ['Total AB Records', result.totalAbRecords],
    ['Matched Records', result.matchedCount],
    ['Total Discrepancies', result.discrepancies.length],
  ];
}

function applyColumnWidths(sheet: XLSX.WorkSheet, widths: number[]): void {
  sheet['!cols'] = widths.map(w => ({ wch: w }));
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
