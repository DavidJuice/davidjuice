import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useFieldMapping } from '../../hooks/useFieldMapping';
import { FieldMapper } from './FieldMapper';
import { SampleDataPreview } from './SampleDataPreview';
import { getSourceConfig } from '../../constants/sourceConfig';

interface MappingPageProps {
  onProceed: () => void;
  onBack: () => void;
}

export function MappingPage({ onProceed, onBack }: MappingPageProps) {
  const parsedSources = useAppStore(s => s.parsedSources);
  const sourceMappings = useAppStore(s => s.sourceMappings);
  const setMatchConfig = useAppStore(s => s.setMatchConfig);
  const { detectAllMappings, updateMapping, applyMappings, allSourcesHaveMiddleName } = useFieldMapping();

  // Auto-detect mappings on mount
  useEffect(() => {
    if (sourceMappings.size === 0 && parsedSources.size > 0) {
      detectAllMappings();
    }
  }, [parsedSources.size, sourceMappings.size, detectAllMappings]);

  const handleProceed = () => {
    // Apply mappings to create unified records
    applyMappings();

    // Auto-detect middle name inclusion
    const includeMiddle = allSourcesHaveMiddleName();
    setMatchConfig({ includeMiddleName: includeMiddle });

    onProceed();
  };

  const hasMappings = sourceMappings.size > 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-semibold text-navy">Map Fields</h2>
        <p className="mt-1 text-sm text-gray">
          Review and adjust how source columns map to standard fields. Auto-detected mappings are shown — adjust any that look incorrect.
        </p>
      </div>

      {/* Middle name detection info */}
      {hasMappings && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          allSourcesHaveMiddleName()
            ? 'border-success/30 bg-success-light text-success'
            : 'border-warning/30 bg-warning-light text-warning'
        }`}>
          {allSourcesHaveMiddleName()
            ? 'All sources have a Middle Name field mapped — middle name will be included in matching identifiers.'
            : 'Not all sources have a Middle Name field — middle name will be excluded from matching identifiers globally for consistency.'
          }
        </div>
      )}

      {/* Field mappers per source */}
      {Array.from(parsedSources.entries()).map(([sourceType, source]) => {
        const mapping = sourceMappings.get(sourceType);
        if (!mapping) return null;
        const config = getSourceConfig(sourceType);

        return (
          <div key={sourceType} className="space-y-3">
            <FieldMapper
              sourceType={sourceType}
              sourceLabel={config.label}
              mappings={mapping.mappings}
              onMappingChange={(col, field) => updateMapping(sourceType, col, field)}
              sampleData={source.rows}
            />
            <SampleDataPreview
              mappings={mapping.mappings}
              rows={source.rows}
              sourceLabel={config.label}
            />
          </div>
        );
      })}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-border pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-border px-6 py-2.5 text-sm font-medium text-gray transition-colors hover:bg-cream-light"
        >
          Back to Upload
        </button>
        <button
          onClick={handleProceed}
          disabled={!hasMappings}
          className={`
            rounded-lg px-6 py-2.5 text-sm font-semibold transition-all
            ${hasMappings
              ? 'bg-navy text-white shadow-md hover:bg-charcoal hover:shadow-lg'
              : 'bg-gray-border text-gray cursor-not-allowed'
            }
          `}
        >
          Continue to Configuration
        </button>
      </div>
    </div>
  );
}
