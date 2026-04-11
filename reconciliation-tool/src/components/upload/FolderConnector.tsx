import { useCallback, useState } from 'react';

interface FolderConnectorProps {
  onFilesSelected: (files: File[]) => void;
  acceptedExtensions: string[];
}

export function FolderConnector({ onFilesSelected, acceptedExtensions }: FolderConnectorProps) {
  const [isSupported] = useState(() => 'showDirectoryPicker' in window);

  const handleFolderPick = useCallback(async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        const files: File[] = [];

        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            if (acceptedExtensions.includes(ext)) {
              files.push(file);
            }
          }
        }

        if (files.length > 0) {
          onFilesSelected(files);
        }
      }
    } catch (err) {
      // User cancelled the picker
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Folder picker error:', err);
      }
    }
  }, [onFilesSelected, acceptedExtensions]);

  const handleFallbackInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (acceptedExtensions.includes(ext)) {
        files.push(file);
      }
    }

    if (files.length > 0) {
      onFilesSelected(files);
    }

    e.target.value = '';
  }, [onFilesSelected, acceptedExtensions]);

  if (!isSupported) {
    return (
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-border bg-white px-4 py-2 text-sm text-navy shadow-sm transition-colors hover:bg-cream-light">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Select Folder
        <input
          type="file"
          className="hidden"
          onChange={handleFallbackInput}
          {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      </label>
    );
  }

  return (
    <button
      onClick={handleFolderPick}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-border bg-white px-4 py-2 text-sm text-navy shadow-sm transition-colors hover:bg-cream-light"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      Connect Folder
    </button>
  );
}
