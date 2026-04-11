import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '../../store/useAppStore';

interface ImageBatchUploaderProps {
  files: File[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (fileName: string) => void;
  onClearAll: () => void;
}

export function ImageBatchUploader({
  files,
  onFilesAdded,
  onFileRemoved,
  onClearAll,
}: ImageBatchUploaderProps) {
  const ocrProgress = useAppStore(s => s.ocrProgress);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      onFilesAdded(accepted);
    }
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
    multiple: true,
    disabled: ocrProgress.isRunning,
  });

  return (
    <div className="rounded-xl border border-gray-border bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-border/50 px-5 py-3">
        <span className="text-2xl">📸</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-navy">UHC Screenshots</h3>
          <p className="text-xs text-gray">Upload client data screenshots for OCR processing</p>
        </div>
        {files.length > 0 && (
          <span className="rounded-full bg-info-light px-2.5 py-1 text-xs font-medium text-info">
            {files.length} images
          </span>
        )}
      </div>

      {/* Drop area */}
      <div
        {...getRootProps()}
        className={`
          cursor-pointer px-5 py-6 text-center transition-colors
          ${isDragActive ? 'bg-gold/10' : 'hover:bg-cream-light/30'}
          ${ocrProgress.isRunning ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        <input {...getInputProps()} />

        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="h-10 w-10 text-gray/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray">
              {isDragActive ? 'Drop images here...' : 'Drag & drop screenshot images here'}
            </p>
            <p className="text-xs text-gray/60">Supports PNG, JPG, WEBP, BMP (100+ images)</p>
          </div>
        ) : (
          <p className="text-xs text-gray">Drop more images or click to add</p>
        )}
      </div>

      {/* Image thumbnail grid */}
      {files.length > 0 && (
        <div className="border-t border-gray-border/50 px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-gray">{files.length} images ready</p>
            <button
              onClick={(e) => { e.stopPropagation(); onClearAll(); }}
              className="text-xs text-error hover:underline"
              disabled={ocrProgress.isRunning}
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {files.slice(0, 30).map(f => (
              <div key={f.name} className="group relative aspect-square overflow-hidden rounded-lg bg-cream">
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-full w-full object-cover"
                  onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); onFileRemoved(f.name); }}
                  className="absolute right-0.5 top-0.5 hidden rounded-full bg-error p-0.5 text-white group-hover:block"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {files.length > 30 && (
              <div className="flex aspect-square items-center justify-center rounded-lg bg-cream text-xs text-gray">
                +{files.length - 30}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OCR Progress */}
      {ocrProgress.isRunning && (
        <div className="border-t border-gray-border/50 px-5 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray">Processing: {ocrProgress.currentFile}</span>
            <span className="font-medium text-navy">
              {ocrProgress.processed} / {ocrProgress.total}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full bg-gold transition-all duration-300"
              style={{ width: `${ocrProgress.total > 0 ? (ocrProgress.processed / ocrProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
