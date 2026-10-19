import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface SmartDragOverlayProps {
  onDropFiles: (files: File[]) => void;
  disabled?: boolean;
}

export const SmartDragOverlay: React.FC<SmartDragOverlayProps> = ({
  onDropFiles,
  disabled = false,
}) => {
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false);
  const [itemCount, setItemCount] = useState<number>(0);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const handleDragEnter = (e: DragEvent) => {
      // Check if the dragged item contains files
      if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;

      e.preventDefault();
      dragCounterRef.current += 1;

      if (e.dataTransfer.items) {
        setItemCount(e.dataTransfer.items.length);
      }

      if (dragCounterRef.current === 1) {
        setIsDraggingOverWindow(true);
        soundFx.playSound('click');
        soundFx.triggerHaptic('light');
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDraggingOverWindow(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingOverWindow(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files);
        soundFx.playSound('beam');
        soundFx.triggerHaptic('medium');
        onDropFiles(filesArray);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [disabled, onDropFiles]);

  return (
    <AnimatePresence>
      {isDraggingOverWindow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-neutral-950/85 backdrop-blur-md pointer-events-auto select-none"
        >
          {/* Ambient Cyber Grid Background Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18)_0%,transparent_70%)] pointer-events-none" />

          {/* Interactive Fluid Drop Zone Card */}
          <motion.div
            initial={{ scale: 0.92, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative flex flex-col items-center justify-center w-full max-w-xl p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed border-indigo-400 bg-neutral-900/90 shadow-2xl shadow-indigo-500/30 overflow-hidden"
          >
            {/* Concentric Pulsing Ripples */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-xl animate-pulse pointer-events-none" />

            {/* Glowing Icon Orb */}
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-full bg-indigo-500/30 blur-lg animate-ping opacity-75" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/40">
                <UploadCloud className="h-12 w-12 animate-bounce" />
              </div>
            </div>

            {/* Header Text */}
            <motion.h3
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2"
            >
              <span>Release to Queue & Transfer</span>
              <Sparkles className="h-6 w-6 text-indigo-400 animate-spin" />
            </motion.h3>

            <motion.p
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mt-2 text-sm text-neutral-300 max-w-md leading-relaxed"
            >
              Drop anywhere across your screen. BeamDrop automatically splits files into 32KB binary streams with zero browser RAM freeze.
            </motion.p>

            {/* Counter badge if multiple files */}
            {itemCount > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-4 py-1.5 text-xs font-bold text-indigo-200"
              >
                <Layers className="h-4 w-4 text-indigo-300" />
                <span>{itemCount > 1 ? `${itemCount} files ready for parallel queue` : '1 file ready for transfer'}</span>
              </motion.div>
            )}

            {/* Supported file badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-neutral-400">
              <span className="flex items-center gap-1 rounded-lg bg-neutral-800/80 px-2.5 py-1 text-neutral-300 border border-neutral-700/60">
                <FileText className="h-3 w-3 text-rose-400" />
                PDF & Docs
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-neutral-800/80 px-2.5 py-1 text-neutral-300 border border-neutral-700/60">
                <ImageIcon className="h-3 w-3 text-indigo-400" />
                PNG & JPG
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-neutral-800/80 px-2.5 py-1 text-neutral-300 border border-neutral-700/60">
                <Video className="h-3 w-3 text-blue-400" />
                MP4 & Video
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-neutral-800/80 px-2.5 py-1 text-neutral-300 border border-neutral-700/60">
                <Music className="h-3 w-3 text-violet-400" />
                Audio
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-neutral-800/80 px-2.5 py-1 text-neutral-300 border border-neutral-700/60">
                <Archive className="h-3 w-3 text-amber-400" />
                ZIP & RAR
              </span>
            </div>

            {/* Bottom Security Footer */}
            <div className="mt-6 flex items-center gap-2 text-[11px] text-neutral-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Direct Peer Stream · Instant Previews · Auto-Saved in Local IndexedDB</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
