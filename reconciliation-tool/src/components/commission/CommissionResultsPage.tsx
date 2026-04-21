import { useState, useCallback } from 'react';
import { useCommissionStore } from '../../store/useCommissionStore';
import { CommissionSummaryDashboard } from './CommissionSummaryDashboard';
import { CommissionTable } from './CommissionTable';
import { CommissionDetailModal } from './CommissionDetailModal';
import { exportCommissionToXlsx } from '../../lib/commissionExportUtils';
import type { CommissionMatch, CommissionRecord } from '../../types/commission';

interface CommissionResultsPageProps {
  onBack: () => void;
  onStartOver: () => void;
}

type DetailData =
  | { type: 'matched'; data: CommissionMatch }
  | { type: 'notInAb'; data: CommissionRecord }
  | { type: 'notInComm'; data: CommissionRecord };

export function CommissionResultsPage({ onBack, onStartOver }: CommissionResultsPageProps) {
  const result = useCommissionStore(s => s.result);
  const [detail, setDetail] = useState<DetailData | null>(null);

  const handleRowClick = useCallback(({ type, index }: { type: 'matched' | 'notInAb' | 'notInComm'; index: number }) => {
    if (!result) return;
    if (type === 'matched') {
      setDetail({ type, data: result.matched[index] });
    } else if (type === 'notInAb') {
      setDetail({ type, data: result.unmatchedComm[index] });
    } else {
      setDetail({ type, data: result.unmatchedAb[index] });
    }
  }, [result]);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray">No commission results available.</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-lg border border-gray-border px-6 py-2 text-sm text-navy hover:bg-cream-light"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title + Export */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Commission Results</h2>
          <p className="mt-1 text-sm text-gray">
            Completed at {new Date(result.timestamp).toLocaleString()}.
            {' '}Matched {result.matchedCount} of {result.totalCommRecords} commission entries to AB records.
          </p>
        </div>
        <button
          onClick={() => exportCommissionToXlsx(result)}
          className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-md transition-all hover:bg-gold/90 hover:shadow-lg"
        >
          Export XLSX
        </button>
      </div>

      {/* Summary */}
      <CommissionSummaryDashboard result={result} />

      {/* Data tables */}
      <CommissionTable
        matched={result.matched}
        unmatchedComm={result.unmatchedComm}
        unmatchedAb={result.unmatchedAb}
        onRowClick={handleRowClick}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-border pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-border px-6 py-2.5 text-sm font-medium text-gray transition-colors hover:bg-cream-light"
        >
          Back to Mapping
        </button>
        <button
          onClick={onStartOver}
          className="rounded-lg border border-navy px-6 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Start New Commission Match
        </button>
      </div>

      {/* Detail modal */}
      <CommissionDetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
