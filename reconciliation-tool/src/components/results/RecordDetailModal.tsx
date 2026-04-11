import type { Discrepancy } from '../../types/reconciliation';
import { CANONICAL_FIELDS } from '../../types';

interface RecordDetailModalProps {
  discrepancy: Discrepancy | null;
  onClose: () => void;
}

export function RecordDetailModal({ discrepancy, onClose }: RecordDetailModalProps) {
  if (!discrepancy) return null;

  const d = discrepancy;
  const bobRecord = d.bobRecord;
  const abRecord = d.abRecord;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-navy">{d.clientName}</h3>
            <p className="text-sm text-gray">DOB: {d.dob}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray transition-colors hover:bg-cream-light hover:text-navy"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 130px)' }}>
          {/* Discrepancy info */}
          <div className={`mb-4 rounded-lg border px-4 py-3 ${
            d.severity === 'high' ? 'border-error/30 bg-error-light' :
            d.severity === 'medium' ? 'border-warning/30 bg-warning-light' :
            'border-info/30 bg-info-light'
          }`}>
            <p className="text-sm font-medium">
              {d.type === 'field_mismatch' && (
                <>
                  <strong>{d.fieldLabel}</strong> mismatch: BOB has "<strong>{d.bobValue}</strong>"
                  but AB has "<strong>{d.abValue}</strong>"
                </>
              )}
              {d.type === 'in_bob_not_in_ab' && 'This record exists in the Book of Business but is missing from AgencyBloc.'}
              {d.type === 'in_ab_not_in_bob' && 'This record exists in AgencyBloc but is not found in the Book of Business.'}
            </p>
          </div>

          {/* Side-by-side comparison */}
          {(bobRecord || abRecord) && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-border bg-cream-light/50">
                  <th className="px-4 py-2 text-left font-medium text-gray">Field</th>
                  <th className="px-4 py-2 text-left font-medium text-success">BOB (Reference)</th>
                  <th className="px-4 py-2 text-left font-medium text-error">AB (Needs Update)</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Status</th>
                </tr>
              </thead>
              <tbody>
                {CANONICAL_FIELDS.map(field => {
                  const bobVal = bobRecord ? String(bobRecord[field.key] || '') : '—';
                  const abVal = abRecord ? String(abRecord[field.key] || '') : '—';
                  const isDiff = bobVal !== abVal && bobVal !== '' && abVal !== '';
                  const isMissing = (bobVal && !abVal) || (!bobVal && abVal);

                  return (
                    <tr
                      key={field.key}
                      className={`border-b border-gray-border/20 ${
                        isDiff ? 'bg-error-light/30' : isMissing ? 'bg-warning-light/20' : ''
                      }`}
                    >
                      <td className="px-4 py-2 font-medium text-navy">{field.label}</td>
                      <td className="px-4 py-2 text-navy">{bobVal || <span className="text-gray/40">—</span>}</td>
                      <td className="px-4 py-2 text-navy">{abVal || <span className="text-gray/40">—</span>}</td>
                      <td className="px-4 py-2">
                        {isDiff ? (
                          <span className="text-xs font-semibold text-error">MISMATCH</span>
                        ) : isMissing ? (
                          <span className="text-xs text-warning">Missing</span>
                        ) : bobVal || abVal ? (
                          <span className="text-xs text-success">Match</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-border px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-navy px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-charcoal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
