interface UploadConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  fileCount: number;
  sourceCount: number;
}

export function UploadConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  fileCount,
  sourceCount,
}: UploadConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-light">
          <svg className="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-navy">Confirm Upload</h3>
        <p className="mt-2 text-sm text-gray">
          You have <strong>{fileCount}</strong> file{fileCount !== 1 ? 's' : ''} uploaded
          across <strong>{sourceCount}</strong> data source{sourceCount !== 1 ? 's' : ''}.
        </p>
        <p className="mt-3 text-sm font-medium text-navy">
          Is every file uploaded in the designated folder?
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-border px-4 py-2.5 text-sm font-medium text-gray transition-colors hover:bg-cream-light"
          >
            No, let me add more
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-charcoal"
          >
            Yes, proceed
          </button>
        </div>
      </div>
    </div>
  );
}
