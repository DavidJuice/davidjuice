import { useEffect, useState } from 'react';
import { useCommissionStore } from '../../store/useCommissionStore';
import { useCommissionFieldMapping } from '../../hooks/useCommissionFieldMapping';
import { useCommissionReconciliation } from '../../hooks/useCommissionReconciliation';
import { FieldMapper } from '../mapping/FieldMapper';
import { SampleDataPreview } from '../mapping/SampleDataPreview';
import { COMMISSION_CANONICAL_FIELDS, AB_COMMISSION_CANONICAL_FIELDS } from '../../types/commission';
import { getSourceConfig } from '../../constants/sourceConfig';
import type { SourceType } from '../../types';

interface CommissionMappingPageProps {
  onProceed: () => void;
  onBack: () => void;
}

export function CommissionMappingPage({ onProceed, onBack }: CommissionMappingPageProps) {
  const parsedSources = useCommissionStore(s => s.parsedSources);
  const sourceMappings = useCommissionStore(s => s.sourceMappings);
  const isMatching = useCommissionStore(s => s.isMatching);
  const { detectAllMappings, updateMapping, applyMappings } = useCommissionFieldMapping();
  const { runMatch } = useCommissionReconciliation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parsedSources.size > 0 && sourceMappings.size === 0) {
      detectAllMappings();
    }
  }, [parsedSources, sourceMappings.size, detectAllMappings]);

  const handleProceed = async () => {
    setError(null);
    applyMappings();

    try {
      await runMatch();
      onProceed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed');
    }
  };

  const getCanonicalFields = (sourceType: SourceType) => {
    return sourceType === 'humana_commission'
      ? COMMISSION_CANONICAL_FIELDS
      : AB_COMMISSION_CANONICAL_FIELDS;
  };

  const hasMappings = sourceMappings.size > 0;
  const hasMbiMapped = Array.from(sourceMappings.values()).every(sm =>
    sm.mappings.some(m => m.canonicalField === 'mbi'),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-navy">Map Commission Fields</h2>
        <p className="mt-1 text-sm text-gray">
          Review the auto-detected field mappings. MBI must be mapped in both files for matching to work.
        </p>
      </div>

      {!hasMbiMapped && hasMappings && (
        <div className="rounded-lg border border-error/30 bg-error-light/50 px-4 py-3 text-sm text-error">
          MBI (Medicare ID) must be mapped in both sources. Please assign the MBI column in each file.
        </div>
      )}

      {Array.from(parsedSources.entries()).map(([sourceType, source]) => {
        const mapping = sourceMappings.get(sourceType);
        if (!mapping) return null;

        const config = getSourceConfig(sourceType);
        const canonicalFields = getCanonicalFields(sourceType);

        return (
          <div key={sourceType} className="space-y-3">
            <FieldMapper
              sourceType={sourceType}
              sourceLabel={config.label}
              mappings={mapping.mappings}
              onMappingChange={(col, field) => updateMapping(sourceType, col, field)}
              sampleData={source.rows}
              canonicalFields={canonicalFields}
            />
            <SampleDataPreview
              mappings={mapping.mappings}
              rows={source.rows}
              sourceLabel={config.label}
              canonicalFields={canonicalFields}
            />
          </div>
        );
      })}

      {error && (
        <div className="rounded-lg border border-error/30 bg-error-light/50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-border pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-border px-6 py-2.5 text-sm font-medium text-gray transition-colors hover:bg-cream-light"
        >
          Back
        </button>
        <button
          onClick={handleProceed}
          disabled={!hasMbiMapped || isMatching}
          className={`
            rounded-lg px-6 py-2.5 text-sm font-semibold transition-all
            ${hasMbiMapped && !isMatching
              ? 'bg-navy text-white shadow-md hover:bg-charcoal hover:shadow-lg'
              : 'bg-gray-border text-gray cursor-not-allowed'
            }
          `}
        >
          {isMatching ? 'Matching...' : 'Run Commission Match'}
        </button>
      </div>
    </div>
  );
}
