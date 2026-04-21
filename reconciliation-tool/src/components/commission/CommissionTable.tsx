import { useState, useMemo } from 'react';
import type { CommissionMatch, CommissionRecord } from '../../types/commission';

type TabKey = 'matched' | 'notInAb' | 'notInComm';

interface CommissionTableProps {
  matched: CommissionMatch[];
  unmatchedComm: CommissionRecord[];
  unmatchedAb: CommissionRecord[];
  onRowClick: (data: { type: TabKey; index: number }) => void;
}

export function CommissionTable({ matched, unmatchedComm, unmatchedAb, onRowClick }: CommissionTableProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('matched');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'matched', label: 'Matched', count: matched.length },
    { key: 'notInAb', label: 'Not in AB', count: unmatchedComm.length },
    { key: 'notInComm', label: 'Not in Commission', count: unmatchedAb.length },
  ];

  const filteredData = useMemo(() => {
    const q = search.toLowerCase();
    if (activeTab === 'matched') {
      return matched.filter(m =>
        !q ||
        m.mbi.toLowerCase().includes(q) ||
        m.commRecord.memberName.toLowerCase().includes(q) ||
        m.commRecord.firstName.toLowerCase().includes(q) ||
        m.commRecord.lastName.toLowerCase().includes(q),
      );
    }
    const records = activeTab === 'notInAb' ? unmatchedComm : unmatchedAb;
    return records.filter(r =>
      !q ||
      r.mbi.toLowerCase().includes(q) ||
      r.memberName.toLowerCase().includes(q) ||
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q),
    );
  }, [activeTab, search, matched, unmatchedComm, unmatchedAb]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paged = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setPage(0);
  };

  return (
    <div className="rounded-xl border border-gray-border bg-white shadow-sm">
      {/* Tabs + search */}
      <div className="flex flex-col gap-3 border-b border-gray-border/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'bg-navy text-white'
                  : 'text-gray hover:bg-cream-light'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name or MBI..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="rounded-lg border border-gray-border px-3 py-1.5 text-sm text-navy placeholder:text-gray/50 focus:border-gold focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-border/50 bg-cream-light/50">
              {activeTab === 'matched' ? (
                <>
                  <th className="px-4 py-2 text-left font-medium text-gray">MBI</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Plan</th>
                  <th className="px-4 py-2 text-right font-medium text-gray">Commission $</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Paid To Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Month Paid</th>
                </>
              ) : activeTab === 'notInAb' ? (
                <>
                  <th className="px-4 py-2 text-left font-medium text-gray">MBI</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Group #</th>
                  <th className="px-4 py-2 text-right font-medium text-gray">Commission $</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Paid To Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Action</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-2 text-left font-medium text-gray">MBI</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Plan</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Product Type</th>
                  <th className="px-4 py-2 text-left font-medium text-gray">Action</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray">
                  {search ? 'No matching records found.' : 'No records in this category.'}
                </td>
              </tr>
            ) : activeTab === 'matched' ? (
              (paged as CommissionMatch[]).map((m, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick({ type: 'matched', index: page * pageSize + i })}
                  className="cursor-pointer border-b border-gray-border/20 transition-colors hover:bg-cream-light/50"
                >
                  <td className="px-4 py-2 font-mono text-xs text-navy">{m.mbi}</td>
                  <td className="px-4 py-2 text-navy">
                    {m.commRecord.memberName || `${m.commRecord.firstName} ${m.commRecord.lastName}`.trim()}
                  </td>
                  <td className="px-4 py-2 text-gray">{m.commRecord.planName}</td>
                  <td className="px-4 py-2 text-right font-medium text-navy">{m.commRecord.commAmt}</td>
                  <td className="px-4 py-2 text-gray">{m.commRecord.paidToDate}</td>
                  <td className="px-4 py-2 text-gray">{m.commRecord.monthPaid}</td>
                </tr>
              ))
            ) : activeTab === 'notInAb' ? (
              (paged as CommissionRecord[]).map((r, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick({ type: 'notInAb', index: page * pageSize + i })}
                  className="cursor-pointer border-b border-gray-border/20 bg-warning-light/20 transition-colors hover:bg-warning-light/40"
                >
                  <td className="px-4 py-2 font-mono text-xs text-navy">{r.mbi}</td>
                  <td className="px-4 py-2 text-navy">
                    {r.memberName || `${r.firstName} ${r.lastName}`.trim()}
                  </td>
                  <td className="px-4 py-2 text-gray">{r.grpNbr}</td>
                  <td className="px-4 py-2 text-right font-medium text-navy">{r.commAmt}</td>
                  <td className="px-4 py-2 text-gray">{r.paidToDate}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-warning-light px-2 py-0.5 text-xs font-medium text-warning">
                      Investigate
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              (paged as CommissionRecord[]).map((r, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick({ type: 'notInComm', index: page * pageSize + i })}
                  className="cursor-pointer border-b border-gray-border/20 bg-error-light/20 transition-colors hover:bg-error-light/40"
                >
                  <td className="px-4 py-2 font-mono text-xs text-navy">{r.mbi}</td>
                  <td className="px-4 py-2 text-navy">
                    {r.memberName || `${r.firstName} ${r.lastName}`.trim()}
                  </td>
                  <td className="px-4 py-2 text-gray">{r.planName}</td>
                  <td className="px-4 py-2 text-gray">{r.prodType}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-error-light px-2 py-0.5 text-xs font-medium text-error">
                      Follow up
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-border/50 px-5 py-3">
          <p className="text-xs text-gray">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredData.length)} of {filteredData.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-2 py-1 text-xs text-navy hover:bg-cream-light disabled:text-gray/40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded px-2 py-1 text-xs text-navy hover:bg-cream-light disabled:text-gray/40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
