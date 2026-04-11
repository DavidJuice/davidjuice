import { useCallback, useState } from 'react';
import { exportToXlsx } from '../../lib/exportUtils';
import type { ReconciliationResult } from '../../types/reconciliation';

interface ExportButtonProps {
  result: ReconciliationResult;
}

export function ExportButton({ result }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    try {
      exportToXlsx(result);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  }, [result]);

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`
        inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all
        ${isExporting
          ? 'bg-success/70 text-white cursor-wait'
          : 'bg-success text-white shadow-md hover:bg-success/90 hover:shadow-lg'
        }
      `}
    >
      {isExporting ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Exporting...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download XLSX
        </>
      )}
    </button>
  );
}
