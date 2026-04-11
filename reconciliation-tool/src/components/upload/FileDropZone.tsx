import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { SourceConfig } from '../../constants/sourceConfig';

interface FileDropZoneProps {
  config: SourceConfig;
  files: File[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (fileName: string) => void;
  isProcessing: boolean;
  parsedRowCount?: number;
  parsedHeaders?: string[];
}

export function FileDropZone({
  config,
  files,
  onFilesAdded,
  onFileRemoved,
  isProcessing,
  parsedRowCount,
  parsedHeaders,
}: FileDropZoneProps) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      onFilesAdded(accepted);
    }
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: config.isImageSource
      ? { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] }
      : {
          'text/csv': ['.csv'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.ms-excel': ['.xls'],
        },
    multiple: config.isImageSource,
    disabled: isProcessing,
  });

  const hasFiles = files.length > 0;
  const isParsed = parsedRowCount !== undefined;

  return (
    <div className="rounded-xl border border-gray-border bg-white shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-border/50 px-5 py-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-navy">{config.label}</h3>
          <p className="text-xs text-gray">{config.description}</p>
        </div>
        {isParsed && (
          <span className="rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success">
            {parsedRowCount} rows
          </span>
        )}
      </div>

      {/* Drop area */}
      <div
        {...getRootProps()}
        className={`
          cursor-pointer px-5 py-6 text-center transition-colors
          ${isDragActive
            ? 'bg-gold/10 border-gold'
            : hasFiles
              ? 'bg-cream-light/50'
              : 'hover:bg-cream-light/30'
          }
          ${isProcessing ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-sm text-gray">Processing...</p>
          </div>
        ) : hasFiles ? (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.name} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-left shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">{f.name}</p>
                  <p className="text-xs text-gray">{formatFileSize(f.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onFileRemoved(f.name); }}
                  className="ml-2 rounded p-1 text-gray hover:bg-error-light hover:text-error"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <p className="text-xs text-gray">
              {config.isImageSource ? 'Drop more images or click to add' : 'Drop a different file to replace'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="h-10 w-10 text-gray/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray">
              {isDragActive ? 'Drop files here...' : `Drag & drop ${config.acceptedFormats} files here`}
            </p>
            <p className="text-xs text-gray/60">or click to browse</p>
          </div>
        )}
      </div>

      {/* Parsed preview */}
      {isParsed && parsedHeaders && parsedHeaders.length > 0 && (
        <div className="border-t border-gray-border/50 px-5 py-3">
          <p className="text-xs font-medium text-gray">Detected columns:</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {parsedHeaders.slice(0, 8).map(h => (
              <span key={h} className="rounded bg-cream px-2 py-0.5 text-xs text-navy">{h}</span>
            ))}
            {parsedHeaders.length > 8 && (
              <span className="rounded bg-cream px-2 py-0.5 text-xs text-gray">+{parsedHeaders.length - 8} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
