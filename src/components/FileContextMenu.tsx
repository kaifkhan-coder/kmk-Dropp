import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Stamp,
  FileText,
  Send,
  Sparkles,
  Trash2,
  Upload,
  ArrowRight,
  Loader2,
  FileCode,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { formatBytes, getFileCategory } from '../utils/format';

export interface FileContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  targetFile: File | null;
  targetIndex?: number | null;
  onClose: () => void;
  onWatermarkAndSend: (file: File, index?: number | null) => void;
  onConvertAndSend: (file: File, index?: number | null) => void;
  onSendNow?: (file: File) => void;
  onOpenWatermarkStudio?: (file?: File) => void;
  onOpenConverterStudio?: (file?: File) => void;
  onOpenAIAnalyze?: (file?: File) => void;
  onRemoveFile?: (index: number) => void;
  onBrowseFiles?: () => void;
  isProcessingAction?: boolean;
  processingActionName?: string | null;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  isOpen,
  position,
  targetFile,
  targetIndex,
  onClose,
  onWatermarkAndSend,
  onConvertAndSend,
  onSendNow,
  onOpenWatermarkStudio,
  onOpenConverterStudio,
  onOpenAIAnalyze,
  onRemoveFile,
  onBrowseFiles,
  isProcessingAction = false,
  processingActionName = null,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Screen collision clamp
  const menuWidth = 260;
  const menuHeight = 360;
  const clampedX = Math.max(12, Math.min(position.x, window.innerWidth - menuWidth - 16));
  const clampedY = Math.max(12, Math.min(position.y, window.innerHeight - menuHeight - 16));

  const isPdf = targetFile?.name.toLowerCase().endsWith('.pdf') || targetFile?.type === 'application/pdf';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none select-none">
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{ top: clampedY, left: clampedX }}
          className="pointer-events-auto absolute w-[260px] rounded-2xl border border-neutral-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/95 dark:shadow-black/70 text-neutral-800 dark:text-neutral-200 text-xs font-sans"
        >
          {/* Target File Header */}
          <div className="px-2.5 py-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Quick Actions
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                1-Click Execution
              </span>
            </div>

            {targetFile ? (
              <div className="mt-1">
                <p className="truncate font-semibold text-neutral-900 dark:text-white font-mono text-[11px]" title={targetFile.name}>
                  {targetFile.name}
                </p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                  {formatBytes(targetFile.size)} · {targetFile.type || 'Document'}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Right-clicked drop zone
              </p>
            )}
          </div>

          {/* Active processing spinner state */}
          {isProcessingAction ? (
            <div className="py-6 px-3 flex flex-col items-center justify-center gap-2 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {processingActionName || 'Processing...'}
              </p>
              <p className="text-[10px] text-neutral-400">Applying changes & initiating transfer</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* PRIMARY ONE-CLICK ACTION 1: Watermark & Send */}
              {targetFile ? (
                <button
                  type="button"
                  onClick={() => {
                    onWatermarkAndSend(targetFile, targetIndex);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-indigo-50/90 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition">
                      <Stamp className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-neutral-900 dark:text-white">
                        <span>Watermark & Send</span>
                        <span className="rounded bg-indigo-600 text-white text-[9px] px-1 py-0.2 font-mono">
                          1-Click
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Stamp confidential watermark & transfer
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onBrowseFiles?.();
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <Upload className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Choose File to Watermark & Send</span>
                </button>
              )}

              {/* PRIMARY ONE-CLICK ACTION 2: Convert & Send */}
              {targetFile && (
                <button
                  type="button"
                  onClick={() => {
                    onConvertAndSend(targetFile, targetIndex);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-emerald-50/90 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-neutral-900 dark:text-white">
                        <span>Convert & Send</span>
                        <span className="rounded bg-emerald-600 text-white text-[9px] px-1 py-0.2 font-mono">
                          {isPdf ? 'PDF→Word' : 'To PDF'}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {isPdf ? 'Convert to Word (.docx) & transfer' : 'Convert to standard PDF & transfer'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </button>
              )}

              {/* PRIMARY ONE-CLICK ACTION 3: Send Now directly */}
              {targetFile && onSendNow && (
                <button
                  type="button"
                  onClick={() => {
                    onSendNow(targetFile);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      <Send className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white">
                        Send Now
                      </div>
                      <p className="text-[10px] text-neutral-400">Direct peer transfer</p>
                    </div>
                  </div>
                </button>
              )}

              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800/80" />

              {/* SECONDARY STUDIO TOOLS */}
              {onOpenWatermarkStudio && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenWatermarkStudio(targetFile || undefined);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <Stamp className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Customize in Watermark Studio...</span>
                </button>
              )}

              {onOpenConverterStudio && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenConverterStudio(targetFile || undefined);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <Layers className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Customize in Document Converter...</span>
                </button>
              )}

              {onOpenAIAnalyze && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAIAnalyze(targetFile || undefined);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  <span>AI Security & Document Analysis...</span>
                </button>
              )}

              {/* REMOVE FILE IF STAGED */}
              {targetIndex !== undefined && targetIndex !== null && onRemoveFile && (
                <>
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800/80" />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveFile(targetIndex);
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove from queue</span>
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
