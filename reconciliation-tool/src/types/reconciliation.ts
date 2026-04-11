import type { SourceType, UnifiedRecord } from './index';

export type DiscrepancyType =
  | 'field_mismatch'
  | 'in_bob_not_in_ab'
  | 'in_ab_not_in_bob';

export type Severity = 'high' | 'medium' | 'low';

export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  clientName: string;
  dob: string;
  field?: string;
  fieldLabel?: string;
  bobValue?: string;
  abValue?: string;
  bobSource?: SourceType;
  abSource?: SourceType;
  severity: Severity;
  bobRecord?: UnifiedRecord;
  abRecord?: UnifiedRecord;
}

export interface ReconciliationResult {
  timestamp: number;
  totalBobRecords: number;
  totalAbRecords: number;
  matchedCount: number;
  discrepancies: Discrepancy[];
  unmatchedBob: UnifiedRecord[];
  unmatchedAb: UnifiedRecord[];
  summaryBySeverity: Record<Severity, number>;
  summaryByType: Record<DiscrepancyType, number>;
  middleNameIncluded: boolean;
  escalationStats: {
    level1Matches: number;
    level2Escalations: number;
    level3Escalations: number;
  };
}

export interface MatchConfig {
  includeMiddleName: boolean;
  escalateWithPhone: boolean;
  escalateWithZip: boolean;
  humanaDateColumn: string;
  comparisonFields: string[];
}

export interface ReconcileWorkerMessage {
  type: 'start';
  bobRecords: UnifiedRecord[];
  abRecords: UnifiedRecord[];
  config: MatchConfig;
}

export interface ReconcileWorkerResult {
  type: 'progress' | 'complete' | 'error';
  progress?: number;
  result?: ReconciliationResult;
  error?: string;
}
