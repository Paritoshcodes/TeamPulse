import { Download, File, FileText } from 'lucide-react';

function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveFileUrl(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  return fileUrl;
}

function getIconForType(mimeType = '') {
  if (mimeType === 'application/pdf') {
    return <FileText className="h-4 w-4 text-red-400" />;
  }
  if (mimeType === 'application/msword' || mimeType.includes('officedocument.wordprocessingml')) {
    return <FileText className="h-4 w-4 text-blue-400" />;
  }
  return <File className="h-4 w-4 text-[var(--color-base-400)]" />;
}

export default function FileMessage({ fileUrl, fileName, fileSize, fileMimeType }) {
  if (!fileUrl) return null;

  const resolvedUrl = resolveFileUrl(fileUrl);
  const isImage = String(fileMimeType || '').startsWith('image/');

  if (isImage) {
    return (
      <img
        src={resolvedUrl}
        alt={fileName || 'Uploaded image'}
        className="mt-2 max-w-[280px] cursor-pointer rounded-xl border border-[var(--color-base-600)]/40 transition-opacity hover:opacity-90"
        onClick={() => window.open(resolvedUrl, '_blank', 'noopener,noreferrer')}
      />
    );
  }

  return (
    <div className="mt-2 flex max-w-[260px] items-center gap-3 rounded-xl border border-[var(--color-base-600)]/40 bg-[var(--color-base-700)] p-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-base-600)]">
        {getIconForType(fileMimeType)}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--color-base-200)]">{fileName || 'Attachment'}</p>
        <p className="text-xs text-[var(--color-base-400)]">{formatFileSize(fileSize)}</p>
      </div>

      <button
        type="button"
        className="ml-auto"
        onClick={() => {
          const anchor = document.createElement('a');
          anchor.href = resolvedUrl;
          anchor.download = fileName || 'download';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
        }}
      >
        <Download className="h-4 w-4 text-[var(--color-brand-400)]" />
      </button>
    </div>
  );
}
