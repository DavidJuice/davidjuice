import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SOURCE_CONFIGS } from '../../constants/sourceConfig';
import { FileDropZone } from './FileDropZone';
import { ImageBatchUploader } from './ImageBatchUploader';
import { FolderConnector } from './FolderConnector';
import { UploadConfirmDialog } from './UploadConfirmDialog';
import { useFileProcessor } from '../../hooks/useFileProcessor';
import type { SourceType } from '../../types';

interface UploadPageProps {
  onProceed: () => void;
}

export function UploadPage({ onProceed }: UploadPageProps) {
  const files = useAppStore(s => s.files);
  const addFile = useAppStore(s => s.addFile);
  const addFiles = useAppStore(s => s.addFiles);
  const removeFile = useAppStore(s => s.removeFile);
  const clearFiles = useAppStore(s => s.clearFiles);
  const parsedSources = useAppStore(s => s.parsedSources);
  const { processFile } = useFileProcessor();

  const [processingSource, setProcessingSource] = useState<SourceType | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Map<SourceType, string>>(new Map());

  const handleFilesAdded = useCallback(async (newFiles: File[], sourceType: SourceType) => {
    const config = SOURCE_CONFIGS.find(c => c.type === sourceType);
    if (!config) return;

    if (config.isImageSource) {
      // For images, accumulate
      const entries = newFiles.map(f => ({
        id: `${sourceType}-${f.name}-${Date.now()}`,
        name: f.name,
        size: f.size,
        sourceType,
        file: f,
      }));
      addFiles(entries);
    } else {
      // For data files, replace existing (one file per source)
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

      // Auto-parse
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
    }
  }, [addFile, addFiles, clearFiles, processFile]);

  const handleFileRemoved = useCallback((fileName: string, sourceType: SourceType) => {
    const entry = files.find(f => f.name === fileName && f.sourceType === sourceType);
    if (entry) removeFile(entry.id);
  }, [files, removeFile]);

  const handleFolderFiles = useCallback((folderFiles: File[]) => {
    // Sort files by type into appropriate sources
    const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'];
    const dataExts = ['.csv', '.xlsx', '.xls'];

    const images = folderFiles.filter(f => imageExts.some(ext => f.name.toLowerCase().endsWith(ext)));
    const dataFiles = folderFiles.filter(f => dataExts.some(ext => f.name.toLowerCase().endsWith(ext)));

    if (images.length > 0) {
      handleFilesAdded(images, 'uhc_ocr');
    }

    // For data files, we can't auto-detect which source they belong to,
    // so we just report the count and let the user drag them individually
    if (dataFiles.length > 0) {
      // TODO: Could show a modal asking user to assign each file to a source
      // For now, just show them in the first available source
    }
  }, [handleFilesAdded]);

  const handleProceed = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleConfirmProceed = useCallback(() => {
    setShowConfirm(false);
    onProceed();
  }, [onProceed]);

  const dataSourceConfigs = SOURCE_CONFIGS.filter(c => !c.isImageSource);
  const hasAnyFiles = files.length > 0;
  const hasAnyParsed = parsedSources.size > 0;

  // Count unique source types with files
  const sourceTypesWithFiles = new Set(files.map(f => f.sourceType));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-semibold text-navy">Upload Data Files</h2>
        <p className="mt-1 text-sm text-gray">
          Upload your AgencyBloc reports and carrier Book of Business files. All processing happens locally on your device.
        </p>
      </div>

      {/* Folder connector */}
      <div className="flex items-center gap-3">
        <FolderConnector
          onFilesSelected={handleFolderFiles}
          acceptedExtensions={['.csv', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.webp', '.bmp']}
        />
        <span className="text-xs text-gray">or drag files into the zones below</span>
      </div>

      {/* Data source drop zones */}
      <div className="grid gap-4 md:grid-cols-2">
        {dataSourceConfigs.map(config => {
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

      {/* Image upload zone */}
      <ImageBatchUploader
        files={files.filter(f => f.sourceType === 'uhc_ocr').map(f => f.file)}
        onFilesAdded={(newFiles) => handleFilesAdded(newFiles, 'uhc_ocr')}
        onFileRemoved={(name) => handleFileRemoved(name, 'uhc_ocr')}
        onClearAll={() => clearFiles('uhc_ocr')}
      />

      {/* Proceed button */}
      <div className="flex items-center justify-between border-t border-gray-border pt-6">
        <p className="text-sm text-gray">
          {hasAnyFiles
            ? `${files.length} file${files.length !== 1 ? 's' : ''} uploaded across ${sourceTypesWithFiles.size} source${sourceTypesWithFiles.size !== 1 ? 's' : ''}`
            : 'No files uploaded yet'
          }
        </p>
        <button
          onClick={handleProceed}
          disabled={!hasAnyParsed}
          className={`
            rounded-lg px-6 py-2.5 text-sm font-semibold transition-all
            ${hasAnyParsed
              ? 'bg-navy text-white shadow-md hover:bg-charcoal hover:shadow-lg'
              : 'bg-gray-border text-gray cursor-not-allowed'
            }
          `}
        >
          Continue to Field Mapping
        </button>
      </div>

      {/* Confirm dialog */}
      <UploadConfirmDialog
        isOpen={showConfirm}
        onConfirm={handleConfirmProceed}
        onCancel={() => setShowConfirm(false)}
        fileCount={files.length}
        sourceCount={sourceTypesWithFiles.size}
      />
    </div>
  );
}
