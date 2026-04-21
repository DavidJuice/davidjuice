import type { CommissionMatch, CommissionRecord } from '../../types/commission';

type DetailData =
  | { type: 'matched'; data: CommissionMatch }
  | { type: 'notInAb'; data: CommissionRecord }
  | { type: 'notInComm'; data: CommissionRecord };

interface CommissionDetailModalProps {
  detail: DetailData | null;
  onClose: () => void;
}

export function CommissionDetailModal({ detail, onClose }: CommissionDetailModalProps) {
  if (!detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-border/50 px-6 py-4">
          <h3 className="text-lg font-semibold text-navy">
            {detail.type === 'matched' ? 'Matched Record' :
             detail.type === 'notInAb' ? 'Commission Only — Not in AB' :
             'AB Only — No Commission'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray transition-colors hover:bg-cream-light hover:text-navy"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {detail.type === 'matched' ? (
            <MatchedDetail match={detail.data} />
          ) : (
            <RecordDetail record={detail.data} label={detail.type === 'notInAb' ? 'Commission Record' : 'AB Record'} />
          )}
        </div>
      </div>
    </div>
  );
}

function MatchedDetail({ match }: { match: CommissionMatch }) {
  const comm = match.commRecord;
  const ab = match.abRecord;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-navy/20 bg-navy/5 px-4 py-2">
        <span className="text-xs font-medium text-gray">MBI</span>
        <p className="font-mono text-sm font-bold text-navy">{match.mbi}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-navy">Commission Data</h4>
          <FieldList fields={[
            ['Name', comm.memberName || `${comm.firstName} ${comm.lastName}`.trim()],
            ['Group #', comm.grpNbr],
            ['Member #', comm.mbrNbr],
            ['Product', comm.prodType],
            ['Plan', comm.planName],
            ['Commission $', comm.commAmt],
            ['Paid To Date', comm.paidToDate],
            ['Month Paid', comm.monthPaid],
          ]} />
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-navy">AgencyBloc Data</h4>
          <FieldList fields={[
            ['Name', ab.memberName || `${ab.firstName} ${ab.lastName}`.trim()],
            ['Plan', ab.planName],
            ['Product Type', ab.prodType],
          ]} />
        </div>
      </div>
    </div>
  );
}

function RecordDetail({ record, label }: { record: CommissionRecord; label: string }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-navy">{label}</h4>
      <FieldList fields={[
        ['MBI', record.mbi],
        ['Name', record.memberName || `${record.firstName} ${record.lastName}`.trim()],
        ['Group #', record.grpNbr],
        ['Member #', record.mbrNbr],
        ['Product', record.prodType],
        ['Plan', record.planName],
        ['Commission $', record.commAmt],
        ['Paid To Date', record.paidToDate],
        ['Month Paid', record.monthPaid],
      ]} />

      {Object.keys(record._rawRow).length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold text-gray">All Raw Fields</h4>
          <div className="max-h-48 overflow-y-auto rounded-lg bg-cream-light/50 p-3">
            {Object.entries(record._rawRow).map(([k, v]) => (
              <div key={k} className="flex gap-2 py-0.5 text-xs">
                <span className="shrink-0 font-medium text-gray">{k}:</span>
                <span className="text-navy">{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldList({ fields }: { fields: [string, string][] }) {
  return (
    <div className="space-y-1.5">
      {fields.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-2">
          <span className="shrink-0 text-xs font-medium text-gray">{label}</span>
          <span className="text-sm text-navy">{value || '—'}</span>
        </div>
      ))}
    </div>
  );
}
