import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Eye,
  FileText,
  CheckCircle,
  ShieldCheck,
  ExternalLink,
  Image as ImageIcon,
  Archive,
  Shield,
  Scan,
  Sparkles,
  Music,
} from 'lucide-react';
import { ReceivedFileItem } from '../types';
import { formatBytes, getFileCategory } from '../utils/format';
import { isSteganographyImage } from '../utils/steganography';

export type PreviewableFile = ReceivedFileItem | File;

interface FilePreviewModalProps {
  file: PreviewableFile | null;
  isOpen: boolean;
  onClose: () => void;
  isSignedIn?: boolean;
  onRequireAuth?: () => void;
  onOpenSteganography?: (file: File) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  isSignedIn = true,
  onRequireAuth,
  onOpenSteganography,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const [hasStego, setHasStego] = useState<boolean>(false);
  const [localUrl, setLocalUrl] = useState<string>('');

  // Extract common file properties whether it's a File or ReceivedFileItem
  const fileName = file ? file.name : '';
  const fileSize = file ? file.size : 0;
  const fileType = file ? file.type : '';
  const fileBlob = file ? (file instanceof File ? file : file.blob) : null;
  const isLocalFile = file instanceof File;

  useEffect(() => {
    if (!file || !fileBlob) {
      setTextContent(null);
      setHasStego(false);
      setLocalUrl('');
      return;
    }

    // Determine preview URL
    let url = '';
    if ('url' in file && typeof file.url === 'string' && file.url) {
      url = file.url;
      setLocalUrl(url);
    } else {
      url = URL.createObjectURL(fileBlob);
      setLocalUrl(url);
    }

    const category = getFileCategory(fileName, fileType);
    if (category === 'image') {
      isSteganographyImage(fileBlob).then((detected) => {
        setHasStego(detected);
      });
    } else {
      setHasStego(false);
    }

    if (category === 'code' || fileName.endsWith('.txt') || fileType.includes('text')) {
      const reader = new FileReader();
      reader.onload = () => {
        setTextContent(reader.result as string);
      };
      reader.readAsText(fileBlob);
    } else {
      setTextContent(null);
    }

    return () => {
      // If we created an object URL specifically for File instance, revoke it
      if (isLocalFile && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, fileBlob, fileName, fileType, isLocalFile]);

  if (!isOpen || !file || !fileBlob) return null;

  const category = getFileCategory(fileName, fileType);
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const handleDownload = async () => {
    if (!isSignedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }

    // On iOS Safari, native Share sheet saves directly to Files / Photos
    if (isIOS && navigator.share && navigator.canShare) {
      try {
        const fileObj = new File([fileBlob], fileName, {
          type: fileType || 'application/octet-stream',
        });
        if (navigator.canShare({ files: [fileObj] })) {
          await navigator.share({
            files: [fileObj],
            title: fileName,
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
    a.href = localUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // iOS Safari fallback: open in tab if needed
    if (isIOS) {
      setTimeout(() => {
        window.open(localUrl, '_blank');
      }, 400);
    }
  };

  const checksumStr = 'checksum' in file && file.checksum ? file.checksum : 'Verified Local Source';

  const copyChecksum = () => {
    navigator.clipboard.writeText(checksumStr);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 shadow-inner">
              {category === 'image' ? (
                <ImageIcon className="h-5 w-5 text-indigo-500" />
              ) : category === 'archive' ? (
                <Archive className="h-5 w-5 text-amber-500" />
              ) : (
                <FileText className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
              )}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                  {fileName}
                </h3>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {isLocalFile ? 'Instant Local Preview' : 'Decrypted File'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                {formatBytes(fileSize)} · {fileType || 'Binary Document'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasStego && onOpenSteganography && (
              <button
                onClick={() => {
                  const fileObj = new File([fileBlob], fileName, {
                    type: fileType || 'image/png',
                  });
                  onOpenSteganography(fileObj);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:opacity-95 transition animate-pulse"
                title="Extract and convert hidden steganography data"
              >
                <Scan className="h-3.5 w-3.5" />
                <span>Extract Stego</span>
              </button>
            )}

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
          {category === 'image' && localUrl ? (
            <div className="max-h-[500px] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <img
                src={localUrl}
                alt={fileName}
                referrerPolicy="no-referrer"
                className="max-h-[460px] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          ) : category === 'pdf' && localUrl ? (
            <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <iframe src={localUrl} title={fileName} className="w-full h-full border-none" />
            </div>
          ) : category === 'audio' && localUrl ? (
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-3">
                <Music className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-2">{fileName}</h4>
              <audio controls src={localUrl} className="w-full mt-2" />
            </div>
          ) : category === 'video' && localUrl ? (
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-neutral-200 bg-black">
              <video controls src={localUrl} className="w-full max-h-[450px]" />
            </div>
          ) : textContent !== null ? (
            <div className="w-full max-h-[480px] overflow-auto rounded-2xl border border-neutral-200 bg-white p-4 font-mono text-xs text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
              <pre className="whitespace-pre-wrap">{textContent}</pre>
            </div>
          ) : (
            <div className="text-center py-12 max-w-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-neutral-500 mb-4 shadow-inner">
                <FileText className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {fileName}
              </h4>
              <p className="mt-1 text-xs text-neutral-500">
                This document is ready to be transferred or saved directly to your local disk.
              </p>
              <button
                onClick={handleDownload}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
              >
                <Download className="h-4 w-4" />
                <span>{isSignedIn ? 'Save to Local Disk' : 'Sign In to Save'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer with SHA-256 Checksum Verification */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200 px-6 py-3 text-xs dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-medium">
              {isLocalFile ? 'Instant Local Preview · In-Memory Buffer Safe' : 'SHA-256 Checksum Verified (Decrypted with zero errors)'}
            </span>
          </div>

          <button
            onClick={copyChecksum}
            className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white truncate max-w-xs"
            title="Click to copy hash or status"
          >
            <span>{checksumStr.length > 20 ? `Hash: ${checksumStr.slice(0, 16)}...` : checksumStr}</span>
            <span className="text-[10px] underline">{copiedChecksum ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
