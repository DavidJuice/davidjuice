import { useState, useCallback } from 'react';
import { useCommissionStore } from '../../store/useCommissionStore';
import { SOURCE_CONFIGS } from '../../constants/sourceConfig';
import { FileDropZone } from '../upload/FileDropZone';
import { useFileProcessor } from '../../hooks/useFileProcessor';
import type { SourceType } from '../../types';

const COMMISSION_SOURCES: SourceType[] = ['humana_commission', 'ab_policy'];

interface CommissionUploadPageProps {
  onProceed: () => void;
}

export function CommissionUploadPage({ onProceed }: CommissionUploadPageProps) {
  const files = useCommissionStore(s => s.files);
  const addFile = useCommissionStore(s => s.addFile);
  const clearFiles = useCommissionStore(s => s.clearFiles);
  const removeFile = useCommissionStore(s => s.removeFile);
  const parsedSources = useCommissionStore(s => s.parsedSources);
  const setParsedSource = useCommissionStore(s => s.setParsedSource);
  const { processFile } = useFileProcessor(setParsedSource);

  const [processingSource, setProcessingSource] = useState<SourceType | null>(null);
  const [errors, setErrors] = useState<Map<SourceType, string>>(new Map());

  const handleFilesAdded = useCallback(async (newFiles: File[], sourceType: SourceType) => {
    clearFiles(sourceType);
    const file = newFiles[0];
    const entry = {
      id: `${sourceType}-${file.name}-${Date.now()}`,
      name: file.name,
      size: file.size,
      sourceType,
      file,
    };
    addFile(entry);

    setProcessingSource(sourceType);
    setErrors(prev => { const next = new Map(prev); next.delete(sourceType); return next; });
    try {
      await processFile(file, sourceType);
    } catch (err) {
      setErrors(prev => {
        const next = new Map(prev);
        next.set(sourceType, err instanceof Error ? err.message : 'Failed to parse file');
        return next;
      });
    } finally {
      setProcessingSource(null);
    }
  }, [addFile, clearFiles, processFile]);

  const handleFileRemoved = useCallback((fileName: string, sourceType: SourceType) => {
    const entry = files.find(f => f.name === fileName && f.sourceType === sourceType);
    if (entry) removeFile(entry.id);
  }, [files, removeFile]);

  const sourceConfigs = SOURCE_CONFIGS.filter(c => COMMISSION_SOURCES.includes(c.type));
  const hasAnyParsed = parsedSources.size > 0;
  const hasBothSources = parsedSources.has('humana_commission') && parsedSources.has('ab_policy');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-navy">Upload Commission Files</h2>
        <p className="mt-1 text-sm text-gray">
          Upload the Humana commission statement and your AgencyBloc policy report. MBI will be used to match records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sourceConfigs.map(config => {
          const sourceFiles = files.filter(f => f.sourceType === config.type).map(f => f.file);
          const parsed = parsedSources.get(config.type);
          const error = errors.get(config.type);

          return (
            <div key={config.type}>
              <FileDropZone
                config={config}
                files={sourceFiles}
                onFilesAdded={(newFiles) => handleFilesAdded(newFiles, config.type)}
                onFileRemoved={(name) => handleFileRemoved(name, config.type)}
                isProcessing={processingSource === config.type}
                parsedRowCount={parsed?.rowCount}
                parsedHeaders={parsed?.headers}
              />
              {error && (
                <p className="mt-1 text-xs text-error">{error}</p>
              )}
            </div>
          );
        })}
      </div>

      {hasAnyParsed && !hasBothSources && (
        <div className="rounded-lg border border-warning/30 bg-warning-light/50 px-4 py-3 text-sm text-warning">
          Upload both files to proceed. The commission statement and AB policy report are both required for matching.
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-border pt-6">
        <p className="text-sm text-gray">
          {files.length > 0
            ? `${files.length} file${files.length !== 1 ? 's' : ''} uploaded`
            : 'No files uploaded yet'
          }
        </p>
        <button
          onClick={onProceed}
          disabled={!hasBothSources}
          className={`
            rounded-lg px-6 py-2.5 text-sm font-semibold transition-all
            ${hasBothSources
              ? 'bg-navy text-white shadow-md hover:bg-charcoal hover:shadow-lg'
              : 'bg-gray-border text-gray cursor-not-allowed'
            }
          `}
        >
          Continue to Field Mapping
        </button>
      </div>
    </div>
  );
}
