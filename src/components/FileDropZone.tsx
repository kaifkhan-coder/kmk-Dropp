import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  Archive,
  Music,
  Video,
  Code,
  Trash2,
  Plus,
  Stamp,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
} from 'lucide-react';
import { formatBytes, getFileCategory, FileCategory } from '../utils/format';
import { TransferHistoryItem, TransferProgress } from '../types';
import { safeLocalStorage } from '../utils/storage';

export interface RecentUploadRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  timestamp: number;
  status: 'ready' | 'transferring' | 'completed' | 'cancelled' | 'failed' | 'uploaded';
}

interface FileDropZoneProps {
  selectedFiles: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
  onStartTransfer: () => void;
  isPeerConnected: boolean;
  peers?: { id: string; deviceName: string; deviceType: string }[];
  onOpenQR: () => void;
  isSignedIn: boolean;
  onRequireAuth: () => void;
  isPaid?: boolean;
  onOpenWatermark?: (file?: File) => void;
  onOpenConverter?: () => void;
  onOpenAIAnalyze?: (file?: File) => void;
  history?: TransferHistoryItem[];
  currentTransfer?: TransferProgress | null;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  selectedFiles,
  onFilesSelected,
  onRemoveFile,
  onClearFiles,
  onStartTransfer,
  isPeerConnected,
  peers = [],
  onOpenQR,
  isSignedIn,
  onRequireAuth,
  isPaid = false,
  onOpenWatermark,
  onOpenConverter,
  onOpenAIAnalyze,
  history = [],
  currentTransfer = null,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persistent local recent upload records
  const [localUploads, setLocalUploads] = useState<RecentUploadRecord[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('beamdrop_recent_uploads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const recordUploads = (newFiles: File[]) => {
    const newRecords: RecentUploadRecord[] = newFiles.map((file) => ({
      id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${encodeURIComponent(file.name.slice(0, 12))}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      timestamp: Date.now(),
      status: 'ready',
    }));

    setLocalUploads((prev) => {
      const filtered = prev.filter(
        (p) => !newFiles.some((nf) => nf.name === p.name && Math.abs(nf.size - p.size) < 10),
      );
      const updated = [...newRecords, ...filtered].slice(0, 20);
      safeLocalStorage.setItem('beamdrop_recent_uploads', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setLocalUploads([]);
    safeLocalStorage.removeItem('beamdrop_recent_uploads');
  };

  const handleRemoveHistoryItem = (id: string) => {
    setLocalUploads((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      safeLocalStorage.setItem('beamdrop_recent_uploads', JSON.stringify(updated));
      return updated;
    });
  };

  // Merge sent items from transfer engine history into local uploads for comprehensive status
  const mergedHistoryList = useMemo(() => {
    const sentHistoryItems: RecentUploadRecord[] = history
      .filter((h) => h.direction === 'sent')
      .map((h) => ({
        id: `hist_${h.id}`,
        name: h.fileName,
        size: h.fileSize,
        type: h.fileType,
        timestamp: h.timestamp,
        status: h.status === 'completed' ? 'completed' : h.status === 'failed' ? 'failed' : 'cancelled',
      }));

    const map = new Map<string, RecentUploadRecord>();

    sentHistoryItems.forEach((item) => {
      map.set(`${item.name}_${item.size}`, item);
    });

    localUploads.forEach((item) => {
      const key = `${item.name}_${item.size}`;
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...item,
          status: existing.status === 'completed' ? 'completed' : item.status,
          timestamp: Math.max(item.timestamp, existing.timestamp),
        });
      } else {
        map.set(key, item);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [localUploads, history]);

  const getItemStatus = (item: RecentUploadRecord) => {
    if (
      currentTransfer &&
      currentTransfer.direction === 'sending' &&
      currentTransfer.fileName === item.name
    ) {
      return {
        label: `Transferring (${Math.round(currentTransfer.percent || 0)}%)`,
        variant: 'transferring',
        badgeClass:
          'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
        dotClass: 'bg-amber-500 animate-pulse',
      };
    }

    const isCurrentlyStaged = selectedFiles.some(
      (f) => f.name === item.name && Math.abs(f.size - item.size) < 10,
    );
    if (isCurrentlyStaged) {
      return {
        label: 'Staged in Queue',
        variant: 'staged',
        badgeClass:
          'bg-indigo-500/10 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40',
        dotClass: 'bg-indigo-500',
      };
    }

    if (item.status === 'completed') {
      return {
        label: 'Transferred',
        variant: 'completed',
        badgeClass:
          'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
        dotClass: 'bg-emerald-500',
      };
    }

    if (item.status === 'failed' || item.status === 'cancelled') {
      return {
        label: item.status === 'failed' ? 'Transfer Failed' : 'Cancelled',
        variant: 'failed',
        badgeClass:
          'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
        dotClass: 'bg-rose-500',
      };
    }

    return {
      label: 'Uploaded',
      variant: 'uploaded',
      badgeClass:
        'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
      dotClass: 'bg-neutral-400',
    };
  };

  const handleZoneClick = () => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      recordUploads(filesArray);
      onFilesSelected(filesArray);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      recordUploads(filesArray);
      onFilesSelected(filesArray);
    }
  };

  const renderFileIcon = (category: FileCategory) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-indigo-500" />;
      case 'pdf':
      case 'document':
        return <FileText className="h-4 w-4 text-rose-500" />;
      case 'archive':
        return <Archive className="h-4 w-4 text-amber-500" />;
      case 'audio':
        return <Music className="h-4 w-4 text-violet-500" />;
      case 'video':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'code':
        return <Code className="h-4 w-4 text-emerald-500" />;
      default:
        return <File className="h-4 w-4 text-neutral-500" />;
    }
  };

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const displayedHistory = showAllHistory ? mergedHistoryList : mergedHistoryList.slice(0, 4);

  return (
    <div id="file-drop-area" className="w-full space-y-4">
      {/* Drop Zone Box with subtle CSS pulse animation when file hovered */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? 'animate-pulse ring-4 ring-indigo-500/30 border-indigo-600 bg-indigo-50/80 dark:border-indigo-400 dark:bg-indigo-950/70 shadow-2xl shadow-indigo-500/20 scale-[0.995] duration-300'
            : 'border-neutral-300/80 hover:border-neutral-400 bg-white/50 dark:border-neutral-800 dark:bg-neutral-900/30 dark:hover:border-neutral-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={!isSignedIn}
        />

        {/* Pulse hover overlay badge */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-indigo-500/10 backdrop-blur-[1px] animate-pulse pointer-events-none z-10">
            <div className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xl animate-bounce">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              <span>Release to Drop & Upload Files</span>
            </div>
          </div>
        )}

        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-3 shadow-inner transition ${
          isDragging ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 scale-110' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
        }`}>
          <UploadCloud className="h-7 w-7" />
        </div>

        <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
          Drop any files here, or <span className="underline decoration-neutral-400 underline-offset-4">browse</span>
        </h4>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
          Supports every format: PDF, Images (PNG, JPG), Audio, Video, TXT, Word, Code, ZIP, and documents of any size.
        </p>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-400">
          <span>Direct browser-to-device transit</span>
          <span>·</span>
          <span>Zero server storage</span>
          <span>·</span>
          <span>Optional E2EE Encryption</span>
        </div>

        {!isSignedIn && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
            <span className="font-semibold">View-Only Mode:</span>
            <span>Sign in to select files and initiate transfers</span>
          </div>
        )}

        {/* Feature Tools Buttons: Watermarking & Document Converter */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {onOpenWatermark && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenWatermark();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
            >
              <Stamp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Watermark Any File & Save</span>
            </div>
          )}

          {onOpenConverter && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenConverter();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Convert PDF ⇄ Word, Text, Image</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual History Log of Recently Uploaded Files - Directly Below Drop Area */}
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              <History className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Recently Uploaded Files
                </span>
                {mergedHistoryList.length > 0 && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-mono font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {mergedHistoryList.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Visual history log & real-time status tracking
              </p>
            </div>
          </div>

          {mergedHistoryList.length > 0 && (
            <div className="flex items-center gap-2">
              {mergedHistoryList.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                >
                  <span>{showAllHistory ? 'Show Less' : `View All (${mergedHistoryList.length})`}</span>
                  {showAllHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                title="Clear upload history log"
              >
                <Trash2 className="h-3 w-3" />
                <span className="hidden sm:inline">Clear Log</span>
              </button>
            </div>
          )}
        </div>

        {/* History Log List with Spring Transitions */}
        {mergedHistoryList.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
            <Clock className="h-5 w-5 mx-auto mb-1.5 opacity-40" />
            <p className="font-medium text-neutral-600 dark:text-neutral-400">No recently uploaded files yet</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Files dropped or browsed above will appear here with names, sizes, and instant status updates.
            </p>
          </div>
        ) : (
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800/80"
          >
            {displayedHistory.map((item) => {
              const category = getFileCategory(item.name, item.type);
              const statusInfo = getItemStatus(item);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 rounded-xl transition group"
                >
                  {/* Left: Icon, Name & Size */}
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 shadow-xs">
                      {renderFileIcon(category)}
                    </div>
                    <div className="min-w-0 truncate">
                      <p
                        className="truncate text-xs font-semibold text-neutral-900 dark:text-white font-mono"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {formatBytes(item.size)}
                        </span>
                        <span>•</span>
                        <span>{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Status Badge & Dismiss Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                      <span>{statusInfo.label}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveHistoryItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-md transition"
                      title="Remove from history"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Selected Files Preview List with spring-transition when expanding */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.96 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.96 }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 26,
              mass: 0.8,
            }}
            className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Ready for Transfer ({selectedFiles.length})</span>
                <span className="font-mono text-neutral-500 font-normal">
                  Total: {formatBytes(totalSize)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add More</span>
                </button>
                <button
                  onClick={onClearFiles}
                  className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Quick Universal Watermark Banner */}
            {onOpenWatermark && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    <strong>Universal Watermarking:</strong> Apply dynamic confidentiality watermark to any file (PDF, Image, Text, Doc) before sharing.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenWatermark(selectedFiles[0])}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
                >
                  Watermark File
                </button>
              </div>
            )}

            {/* Files List with animated spring layout items */}
            <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800/80 max-h-60 overflow-y-auto pr-1">
              <AnimatePresence>
                {selectedFiles.map((file, idx) => {
                  const category = getFileCategory(file.name, file.type);

                  return (
                    <motion.div
                      key={`${file.name}_${file.size}_${idx}`}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 28,
                      }}
                      className="flex items-center justify-between py-2.5 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          {renderFileIcon(category)}
                        </div>
                        <div className="truncate">
                          <p className="truncate text-xs font-medium text-neutral-900 dark:text-white font-mono">
                            {file.name}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-500">
                            {formatBytes(file.size)} · {file.type || 'Binary Document'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Watermark button for file */}
                        {onOpenWatermark && (
                          <button
                            type="button"
                            onClick={() => onOpenWatermark(file)}
                            title="Watermark this file and save to downloads"
                            className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950 dark:text-indigo-300 transition"
                          >
                            <Stamp className="h-3 w-3" />
                            <span className="hidden sm:inline">Watermark</span>
                          </button>
                        )}

                        <button
                          onClick={() => onRemoveFile(idx)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-rose-600 transition dark:hover:bg-neutral-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Primary Transfer Action (Opens Encryption Decision Modal) */}
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {peers.length > 0 ? (
                  <div className="space-y-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        {peers.length === 1
                          ? `● Connected: ${peers[0].deviceName}`
                          : `● ${peers.length} Devices Connected (${peers.map((p) => p.deviceName).join(', ')})`}
                      </span>
                    </span>
                    {peers.length > 1 && (
                      <p className="text-[11px] text-neutral-400">
                        Multi-device sync: all {peers.length} devices will receive the files simultaneously.
                      </p>
                    )}
                  </div>
                ) : isPeerConnected ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ● Peer device connected and ready
                  </span>
                ) : (
                  <span>Scan QR code with receiving device to connect</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isPeerConnected && (
                  <button
                    onClick={onOpenQR}
                    className="w-full sm:w-auto rounded-xl border border-neutral-300 py-2.5 px-4 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 transition whitespace-nowrap"
                  >
                    Show QR Code
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!isSignedIn) {
                      onRequireAuth();
                      return;
                    }
                    onStartTransfer();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2.5 px-6 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition whitespace-nowrap"
                >
                  {!isSignedIn
                    ? 'Sign In to Transfer'
                    : isPeerConnected
                    ? 'Transfer Files Now'
                    : 'Send & Connect'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
