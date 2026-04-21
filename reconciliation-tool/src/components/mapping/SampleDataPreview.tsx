import type { FieldMapping } from '../../types';
import { CANONICAL_FIELDS } from '../../types';
import { IGNORE_FIELD } from '../../constants/fieldMappings';

interface SampleDataPreviewProps {
  mappings: FieldMapping[];
  rows: Record<string, string>[];
  sourceLabel: string;
  canonicalFields?: { key: string; label: string; category: string }[];
}

export function SampleDataPreview({ mappings, rows, sourceLabel, canonicalFields = CANONICAL_FIELDS }: SampleDataPreviewProps) {
  const activeMappings = mappings.filter(m => m.canonicalField !== IGNORE_FIELD);
  const previewRows = rows.slice(0, 5);

  if (activeMappings.length === 0 || previewRows.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-border bg-white shadow-sm">
      <div className="border-b border-gray-border/50 px-5 py-3">
        <h4 className="text-sm font-semibold text-navy">Preview: {sourceLabel}</h4>
        <p className="text-xs text-gray">Showing first {previewRows.length} rows with mapped fields</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-border/50 bg-cream-light/50">
              {activeMappings.map(m => {
                const field = canonicalFields.find(f => f.key === m.canonicalField);
                return (
                  <th key={m.sourceColumn} className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray">
                    {field?.label || m.canonicalField}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className="border-b border-gray-border/20">
                {activeMappings.map(m => (
                  <td key={m.sourceColumn} className="whitespace-nowrap px-3 py-2 text-navy">
                    {row[m.sourceColumn] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
