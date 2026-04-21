import type { SourceType } from './index';

export type CommissionSourceType = Extract<SourceType, 'humana_commission' | 'ab_policy'>;

export interface CommissionRecord {
  mbi: string;
  grpNbr: string;
  mbrNbr: string;
  memberName: string;
  firstName: string;
  lastName: string;
  prodType: string;
  planName: string;
  paidToDate: string;
  monthPaid: string;
  commAmt: string;
  _source: CommissionSourceType;
  _rawRow: Record<string, string>;
  [key: string]: string | CommissionSourceType | Record<string, string>;
}

export const COMMISSION_CANONICAL_FIELDS: { key: string; label: string; category: string }[] = [
  { key: 'mbi', label: 'MBI (Medicare ID)', category: 'Identity' },
  { key: 'memberName', label: 'Member Name', category: 'Identity' },
  { key: 'firstName', label: 'First Name', category: 'Identity' },
  { key: 'lastName', label: 'Last Name', category: 'Identity' },
  { key: 'grpNbr', label: 'Group Number', category: 'Policy' },
  { key: 'mbrNbr', label: 'Member Number', category: 'Policy' },
  { key: 'prodType', label: 'Product Type', category: 'Policy' },
  { key: 'planName', label: 'Plan Name', category: 'Policy' },
  { key: 'paidToDate', label: 'Paid To Date', category: 'Commission' },
  { key: 'monthPaid', label: 'Month Paid', category: 'Commission' },
  { key: 'commAmt', label: 'Commission Amount', category: 'Commission' },
];

export const AB_COMMISSION_CANONICAL_FIELDS: { key: string; label: string; category: string }[] = [
  { key: 'mbi', label: 'MBI (Medicare ID)', category: 'Identity' },
  { key: 'firstName', label: 'First Name', category: 'Identity' },
  { key: 'lastName', label: 'Last Name', category: 'Identity' },
  { key: 'planName', label: 'Plan Name', category: 'Policy' },
  { key: 'paidToDate', label: 'Paid To Date', category: 'Policy' },
  { key: 'prodType', label: 'Product Type', category: 'Policy' },
];

export interface CommissionMatch {
  mbi: string;
  commRecord: CommissionRecord;
  abRecord: CommissionRecord;
}

export interface CommissionResult {
  timestamp: number;
  totalCommRecords: number;
  totalAbRecords: number;
  matchedCount: number;
  matched: CommissionMatch[];
  unmatchedComm: CommissionRecord[];
  unmatchedAb: CommissionRecord[];
  totalCommissionAmount: number;
  matchedCommissionAmount: number;
  unmatchedCommissionAmount: number;
}

export type CommissionWizardStep = 1 | 2 | 3;

export interface CommissionWorkerMessage {
  type: 'start';
  commRecords: CommissionRecord[];
  abRecords: CommissionRecord[];
}

export interface CommissionWorkerResult {
  type: 'complete' | 'error';
  result?: CommissionResult;
  error?: string;
}
