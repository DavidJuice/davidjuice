import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SummaryDashboard } from './SummaryDashboard';
import { DiscrepancyTable } from './DiscrepancyTable';
import { RecordDetailModal } from './RecordDetailModal';
import { ExportButton } from './ExportButton';
import type { Discrepancy } from '../../types/reconciliation';

interface ResultsPageProps {
  onBack: () => void;
  onStartOver: () => void;
}

export function ResultsPage({ onBack, onStartOver }: ResultsPageProps) {
  const result = useAppStore(s => s.result);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray">No reconciliation results available.</p>
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
      {/* Title */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Reconciliation Results</h2>
          <p className="mt-1 text-sm text-gray">
            Completed at {new Date(result.timestamp).toLocaleString()}.
            BOB is the reference — discrepancies show what needs correction in AgencyBloc.
          </p>
        </div>
        <ExportButton result={result} />
      </div>

      {/* Summary */}
      <SummaryDashboard result={result} />

      {/* Discrepancy table */}
      {result.discrepancies.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-navy">
            Discrepancies ({result.discrepancies.length})
          </h3>
          <DiscrepancyTable
            discrepancies={result.discrepancies}
            onRowClick={setSelectedDiscrepancy}
          />
        </div>
      )}

      {/* No discrepancies */}
      {result.discrepancies.length === 0 && (
        <div className="rounded-xl border border-success/30 bg-success-light p-8 text-center">
          <p className="text-xl font-semibold text-success">All records match!</p>
          <p className="mt-1 text-sm text-gray">
            No discrepancies found between the Book of Business and AgencyBloc.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-border pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-border px-6 py-2.5 text-sm font-medium text-gray transition-colors hover:bg-cream-light"
        >
          Back to Configuration
        </button>
        <button
          onClick={onStartOver}
          className="rounded-lg border border-navy px-6 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Start New Reconciliation
        </button>
      </div>

      {/* Detail modal */}
      <RecordDetailModal
        discrepancy={selectedDiscrepancy}
        onClose={() => setSelectedDiscrepancy(null)}
      />
    </div>
  );
}
