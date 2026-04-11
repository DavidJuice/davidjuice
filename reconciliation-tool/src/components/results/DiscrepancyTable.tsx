import { useState, useMemo } from 'react';
import type { Discrepancy } from '../../types/reconciliation';

interface DiscrepancyTableProps {
  discrepancies: Discrepancy[];
  onRowClick: (discrepancy: Discrepancy) => void;
}

type SortField = 'clientName' | 'severity' | 'type' | 'field';
type SortDir = 'asc' | 'desc';

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PAGE_SIZE = 50;

export function DiscrepancyTable({ discrepancies, onRowClick }: DiscrepancyTableProps) {
  const [filter, setFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = discrepancies;

    if (filter) {
      const lower = filter.toLowerCase();
      result = result.filter(d =>
        d.clientName.toLowerCase().includes(lower) ||
        d.dob.includes(lower) ||
        (d.field && d.field.toLowerCase().includes(lower)) ||
        (d.bobValue && d.bobValue.toLowerCase().includes(lower)) ||
        (d.abValue && d.abValue.toLowerCase().includes(lower))
      );
    }

    if (severityFilter !== 'all') {
      result = result.filter(d => d.severity === severityFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(d => d.type === typeFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'clientName':
          cmp = a.clientName.localeCompare(b.clientName);
          break;
        case 'severity':
          cmp = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
          break;
        case 'type':
          cmp = a.type.localeCompare(b.type);
          break;
        case 'field':
          cmp = (a.fieldLabel || '').localeCompare(b.fieldLabel || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [discrepancies, filter, severityFilter, typeFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray/30 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="rounded-xl border border-gray-border bg-white shadow-sm">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-border/50 px-5 py-3">
        <input
          type="text"
          placeholder="Search by name, field, or value..."
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          className="flex-1 rounded-lg border border-gray-border bg-cream-light/50 px-3 py-2 text-sm text-navy placeholder:text-gray/50"
        />
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-gray-border bg-white px-3 py-2 text-sm text-navy"
        >
          <option value="all">All Severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-gray-border bg-white px-3 py-2 text-sm text-navy"
        >
          <option value="all">All Types</option>
          <option value="field_mismatch">Field Mismatch</option>
          <option value="in_bob_not_in_ab">In BOB, Not in AB</option>
          <option value="in_ab_not_in_bob">In AB, Not in BOB</option>
        </select>
        <span className="text-xs text-gray">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-border/50 bg-cream-light/50">
              <th
                onClick={() => handleSort('severity')}
                className="cursor-pointer px-4 py-2 text-left font-medium text-gray"
              >
                Severity<SortIcon field="severity" />
              </th>
              <th
                onClick={() => handleSort('clientName')}
                className="cursor-pointer px-4 py-2 text-left font-medium text-gray"
              >
                Client Name<SortIcon field="clientName" />
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray">DOB</th>
              <th
                onClick={() => handleSort('type')}
                className="cursor-pointer px-4 py-2 text-left font-medium text-gray"
              >
                Type<SortIcon field="type" />
              </th>
              <th
                onClick={() => handleSort('field')}
                className="cursor-pointer px-4 py-2 text-left font-medium text-gray"
              >
                Field<SortIcon field="field" />
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray">BOB Value</th>
              <th className="px-4 py-2 text-left font-medium text-gray">AB Value</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(d => (
              <tr
                key={d.id}
                onClick={() => onRowClick(d)}
                className="cursor-pointer border-b border-gray-border/20 transition-colors hover:bg-cream-light/50"
              >
                <td className="px-4 py-2">
                  <SeverityBadge severity={d.severity} />
                </td>
                <td className="px-4 py-2 font-medium text-navy">{d.clientName}</td>
                <td className="px-4 py-2 text-gray">{d.dob}</td>
                <td className="px-4 py-2">
                  <TypeBadge type={d.type} />
                </td>
                <td className="px-4 py-2 text-navy">{d.fieldLabel || '—'}</td>
                <td className="max-w-[150px] truncate px-4 py-2 text-success">{d.bobValue || '—'}</td>
                <td className="max-w-[150px] truncate px-4 py-2 text-error">{d.abValue || '—'}</td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray">
                  {filter || severityFilter !== 'all' || typeFilter !== 'all'
                    ? 'No discrepancies match your filters.'
                    : 'No discrepancies found — all records match!'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-border/50 px-5 py-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-gray-border px-3 py-1.5 text-xs text-navy disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-gray-border px-3 py-1.5 text-xs text-navy disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    high: 'bg-error-light text-error',
    medium: 'bg-warning-light text-warning',
    low: 'bg-info-light text-info',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${styles[severity] || ''}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    field_mismatch: 'Mismatch',
    in_bob_not_in_ab: 'Missing in AB',
    in_ab_not_in_bob: 'Not in BOB',
  };
  return (
    <span className="inline-block rounded bg-cream px-2 py-0.5 text-xs text-navy">
      {labels[type] || type}
    </span>
  );
}
