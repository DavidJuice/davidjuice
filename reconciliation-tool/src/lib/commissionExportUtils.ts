import * as XLSX from 'xlsx';
import type { CommissionResult } from '../types/commission';

export function exportCommissionToXlsx(result: CommissionResult): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['Commission Reconciliation Summary'],
    [''],
    ['Generated', new Date(result.timestamp).toLocaleString()],
    [''],
    ['Total Commission Entries', result.totalCommRecords],
    ['Total AB Records', result.totalAbRecords],
    ['Matched Entries', result.matchedCount],
    ['In Commission, Not in AB', result.unmatchedComm.length],
    ['In AB, Not in Commission', result.unmatchedAb.length],
    [''],
    ['Commission Amounts'],
    ['Total Commission $', formatCurrency(result.totalCommissionAmount)],
    ['Matched Commission $', formatCurrency(result.matchedCommissionAmount)],
    ['Unmatched Commission $', formatCurrency(result.unmatchedCommissionAmount)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  applyColumnWidths(summarySheet, [30, 20]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 2: Matched (ready for AB sync)
  if (result.matched.length > 0) {
    const matchedRows = result.matched.map(m => ({
      'MBI': m.mbi,
      'Member Name': m.commRecord.memberName || `${m.commRecord.firstName} ${m.commRecord.lastName}`.trim(),
      'Group Number': m.commRecord.grpNbr,
      'Member Number': m.commRecord.mbrNbr,
      'Product Type': m.commRecord.prodType,
      'Plan Name': m.commRecord.planName,
      'Commission Amount': m.commRecord.commAmt,
      'Paid To Date': m.commRecord.paidToDate,
      'Month Paid': m.commRecord.monthPaid,
      'AB Client Name': m.abRecord.memberName || `${m.abRecord.firstName} ${m.abRecord.lastName}`.trim(),
      'AB Plan': m.abRecord.planName,
    }));
    const matchedSheet = XLSX.utils.json_to_sheet(matchedRows);
    applyColumnWidths(matchedSheet, [15, 20, 15, 15, 15, 20, 15, 15, 15, 20, 20]);
    XLSX.utils.book_append_sheet(workbook, matchedSheet, 'Matched - Sync to AB');
  }

  // Sheet 3: In Commission, Not in AB
  if (result.unmatchedComm.length > 0) {
    const commOnlyRows = result.unmatchedComm.map(r => ({
      'MBI': r.mbi,
      'Member Name': r.memberName || `${r.firstName} ${r.lastName}`.trim(),
      'Group Number': r.grpNbr,
      'Member Number': r.mbrNbr,
      'Product Type': r.prodType,
      'Plan Name': r.planName,
      'Commission Amount': r.commAmt,
      'Paid To Date': r.paidToDate,
      'Month Paid': r.monthPaid,
      'Action Required': 'Unknown payment - investigate and add to AB if valid',
    }));
    const commOnlySheet = XLSX.utils.json_to_sheet(commOnlyRows);
    applyColumnWidths(commOnlySheet, [15, 20, 15, 15, 15, 20, 15, 15, 15, 40]);
    XLSX.utils.book_append_sheet(workbook, commOnlySheet, 'In Commission Not In AB');
  }

  // Sheet 4: In AB, Not in Commission
  if (result.unmatchedAb.length > 0) {
    const abOnlyRows = result.unmatchedAb.map(r => ({
      'MBI': r.mbi,
      'Client Name': r.memberName || `${r.firstName} ${r.lastName}`.trim(),
      'Plan': r.planName,
      'Product Type': r.prodType,
      'Action Required': 'Carrier not paying - follow up with Humana',
    }));
    const abOnlySheet = XLSX.utils.json_to_sheet(abOnlyRows);
    applyColumnWidths(abOnlySheet, [15, 20, 20, 15, 40]);
    XLSX.utils.book_append_sheet(workbook, abOnlySheet, 'In AB Not In Commission');
  }

  const dateStr = formatDate(new Date());
  const fileName = `commission sync ${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
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

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
