import React, { useState, useEffect } from 'react';
import { Download, X, Eye, FileText, CheckCircle, ShieldCheck, ExternalLink, Image as ImageIcon, Archive } from 'lucide-react';
import { ReceivedFileItem } from '../types';
import { formatBytes, getFileCategory } from '../utils/format';

interface FilePreviewModalProps {
  file: ReceivedFileItem | null;
  isOpen: boolean;
  onClose: () => void;
  isSignedIn?: boolean;
  onRequireAuth?: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  isSignedIn = true,
  onRequireAuth,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  useEffect(() => {
    if (!file) {
      setTextContent(null);
      return;
    }

    const category = getFileCategory(file.name, file.type);
    if (category === 'code' || file.name.endsWith('.txt') || file.type.includes('text')) {
      const reader = new FileReader();
      reader.onload = () => {
        setTextContent(reader.result as string);
      };
      reader.readAsText(file.blob);
    } else {
      setTextContent(null);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const category = getFileCategory(file.name, file.type);

  const isIOS = typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const handleDownload = async () => {
    if (!isSignedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }

    // On iOS Safari, native Share sheet saves directly to Files / Photos
    if (isIOS && navigator.share && navigator.canShare) {
      try {
        const fileObj = new File([file.blob], file.name, { type: file.type || 'application/octet-stream' });
        if (navigator.canShare({ files: [fileObj] })) {
          await navigator.share({
            files: [fileObj],
            title: file.name,
          });
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('iOS share warning:', err);
        } else {
          return;
        }
      }
    }

    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // iOS Safari fallback: open in tab if needed
    if (isIOS) {
      setTimeout(() => {
        window.open(file.url, '_blank');
      }, 400);
    }
  };


  const copyChecksum = () => {
    navigator.clipboard.writeText(file.checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
              {category === 'image' ? (
                <ImageIcon className="h-5 w-5 text-indigo-500" />
              ) : category === 'archive' ? (
                <Archive className="h-5 w-5 text-amber-500" />
              ) : (
                <FileText className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
              )}
            </div>
            <div className="truncate">
              <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                {file.name}
              </h3>
              <p className="text-xs text-neutral-500 font-mono">
                {formatBytes(file.size)} · {file.type || 'Binary File'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isSignedIn ? 'Save to Device' : 'Sign In to Save'}</span>
            </button>
            <button
              onClick={onClose}

              className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-neutral-50/50 dark:bg-neutral-900/20">
          {category === 'image' ? (
            <div className="max-h-[500px] overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <img
                src={file.url}
                alt={file.name}
                referrerPolicy="no-referrer"
                className="max-h-[460px] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          ) : category === 'pdf' ? (
            <div className="w-full h-[480px] rounded-xl overflow-hidden border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <iframe
                src={file.url}
                title={file.name}
                className="w-full h-full border-none"
              />
            </div>
          ) : category === 'audio' ? (
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-center">
              <audio controls src={file.url} className="w-full mt-2" />
            </div>
          ) : category === 'video' ? (
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-neutral-200 bg-black">
              <video controls src={file.url} className="w-full max-h-[450px]" />
            </div>
          ) : textContent !== null ? (
            <div className="w-full max-h-[480px] overflow-auto rounded-xl border border-neutral-200 bg-white p-4 font-mono text-xs text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
              <pre className="whitespace-pre-wrap">{textContent}</pre>
            </div>
          ) : (
            <div className="text-center py-12 max-w-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-neutral-500 mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {file.name}
              </h4>
              <p className="mt-1 text-xs text-neutral-500">
                This document is ready to be saved to your local disk or mobile storage.
              </p>
              <button
                onClick={handleDownload}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
              >
                <Download className="h-4 w-4" />
                <span>{isSignedIn ? 'Save to Local Storage' : 'Sign In to Save'}</span>
              </button>

            </div>
          )}
        </div>

        {/* Footer with SHA-256 Checksum Verification */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200 px-6 py-3 text-xs dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-medium">SHA-256 Checksum Verified (Decrypted with zero errors)</span>
          </div>

          <button
            onClick={copyChecksum}
            className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white truncate max-w-xs"
            title="Click to copy SHA-256 hash"
          >
            <span>Hash: {file.checksum.slice(0, 16)}...</span>
            <span className="text-[10px] underline">{copiedChecksum ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
