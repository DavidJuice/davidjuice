import type { FieldMapping, SourceType } from '../../types';
import { CANONICAL_FIELDS } from '../../types';
import { IGNORE_FIELD } from '../../constants/fieldMappings';

interface FieldMapperProps {
  sourceType: SourceType;
  sourceLabel: string;
  mappings: FieldMapping[];
  onMappingChange: (sourceColumn: string, canonicalField: string) => void;
  sampleData: Record<string, string>[];
}

export function FieldMapper({
  sourceLabel,
  mappings,
  onMappingChange,
  sampleData,
}: FieldMapperProps) {
  const unmappedCount = mappings.filter(m => m.canonicalField === IGNORE_FIELD).length;
  const fuzzyCount = mappings.filter(m => !m.isManual && m.confidence > 0 && m.confidence < 1).length;

  return (
    <div className="rounded-xl border border-gray-border bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-border/50 px-5 py-3">
        <h3 className="text-sm font-semibold text-navy">{sourceLabel}</h3>
        <div className="flex gap-2">
          {fuzzyCount > 0 && (
            <span className="rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-warning">
              {fuzzyCount} needs review
            </span>
          )}
          {unmappedCount > 0 && (
            <span className="rounded-full bg-error-light px-2.5 py-1 text-xs font-medium text-error">
              {unmappedCount} unmapped
            </span>
          )}
          {unmappedCount === 0 && fuzzyCount === 0 && (
            <span className="rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success">
              All mapped
            </span>
          )}
        </div>
      </div>

      {/* Mapping table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-border/50 bg-cream-light/50">
              <th className="px-4 py-2 text-left font-medium text-gray">Source Column</th>
              <th className="px-4 py-2 text-left font-medium text-gray">Maps To</th>
              <th className="px-4 py-2 text-left font-medium text-gray">Confidence</th>
              <th className="px-4 py-2 text-left font-medium text-gray">Sample Data</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(m => {
              const sampleValue = sampleData[0]?.[m.sourceColumn] || '';
              const isExact = m.confidence === 1 && !m.isManual;
              const isFuzzy = !m.isManual && m.confidence > 0 && m.confidence < 1;
              const isUnmapped = m.canonicalField === IGNORE_FIELD;
              const isManual = m.isManual;

              return (
                <tr
                  key={m.sourceColumn}
                  className={`border-b border-gray-border/30 ${
                    isUnmapped ? 'bg-error-light/30' : isFuzzy ? 'bg-warning-light/30' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-navy">{m.sourceColumn}</td>
                  <td className="px-4 py-2">
                    <select
                      value={m.canonicalField}
                      onChange={(e) => onMappingChange(m.sourceColumn, e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1.5 text-sm ${
                        isUnmapped
                          ? 'border-error/30 bg-error-light/50'
                          : isFuzzy
                            ? 'border-warning/30 bg-warning-light/50'
                            : 'border-gray-border bg-white'
                      }`}
                    >
                      <option value={IGNORE_FIELD}>-- Ignore this column --</option>
                      {CANONICAL_FIELDS.map(f => (
                        <option key={f.key} value={f.key}>
                          {f.label} ({f.category})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    {isManual ? (
                      <span className="text-xs text-info">Manual</span>
                    ) : isExact ? (
                      <span className="text-xs text-success">Exact match</span>
                    ) : isFuzzy ? (
                      <span className="text-xs text-warning">
                        {Math.round(m.confidence * 100)}% match
                      </span>
                    ) : (
                      <span className="text-xs text-gray">—</span>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2 text-xs text-gray">
                    {sampleValue || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
