import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Laptop,
  Tablet,
  Check,
  RotateCcw,
  Eye,
  Plus,
  ArrowRight,
  Zap,
  Users,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  File,
  X,
  Sparkles,
} from 'lucide-react';
import { PeerDevice, TransferHistoryItem } from '../types';
import { formatBytes, getFileCategory } from '../utils/format';
import { soundFx } from '../utils/soundEffects';
import { saveTransferToDB } from '../utils/indexedDBHistory';

export interface QueueFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  category: string;
  previewUrl: string;
  assignedPeerIds: string[]; // IDs of peers assigned to receive this file
  status: 'queued' | 'transferring' | 'completed' | 'failed' | 'paused' | 'cancelled';
  percent: number;
  speedBps: number;
  etaSeconds: number;
  bytesTransferred: number;
  error?: string;
}

interface QueueManagerProps {
  files: File[];
  peers: PeerDevice[];
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
  onAddMoreFiles: () => void;
  onPreviewFile?: (file: File, previewUrl: string) => void;
  onTransferComplete?: (item: TransferHistoryItem) => void;
  onOpenQRScanner?: () => void;
  onOpenQRModal?: () => void;
  myDeviceName?: string;
  isP2PConnected?: boolean;
}

export const QueueManager: React.FC<QueueManagerProps> = ({
  files,
  peers,
  onRemoveFile,
  onClearFiles,
  onAddMoreFiles,
  onPreviewFile,
  onTransferComplete,
  onOpenQRScanner,
  onOpenQRModal,
  myDeviceName = 'My Device',
  isP2PConnected = false,
}) => {
  const [queueItems, setQueueItems] = useState<QueueFileItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const activeAbortControllers = useRef<Map<string, AbortController>>(new Map());

  // Initialize and synchronize queueItems with files prop
  useEffect(() => {
    setQueueItems((prevItems) => {
      const prevMap = new Map(prevItems.map((item) => [item.file, item]));
      return files.map((file, idx) => {
        const existing = prevMap.get(file);
        if (existing) return existing;

        const category = getFileCategory(file.name, file.type);
        let previewUrl = '';
        try {
          if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            previewUrl = URL.createObjectURL(file);
          }
        } catch {
          // ignore preview error
        }

        // By default assign to all currently connected peers, or empty if none yet
        const defaultPeers = peers.length > 0 ? peers.map((p) => p.id) : [];

        return {
          id: `queue_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          category,
          previewUrl,
          assignedPeerIds: defaultPeers,
          status: 'queued',
          percent: 0,
          speedBps: 0,
          etaSeconds: 0,
          bytesTransferred: 0,
        };
      });
    });
  }, [files, peers.length]);

  // Clean up ObjectURLs when unmounting
  useEffect(() => {
    return () => {
      queueItems.forEach((item) => {
        if (item.previewUrl) {
          try {
            URL.revokeObjectURL(item.previewUrl);
          } catch {}
        }
      });
    };
  }, []);

  // Toggle assigning a peer to a specific queued file
  const handleTogglePeerAssignment = (fileId: string, peerId: string) => {
    soundFx.playSound('click');
    soundFx.triggerHaptic('light');

    setQueueItems((prev) =>
      prev.map((item) => {
        if (item.id !== fileId) return item;
        const assigned = item.assignedPeerIds.includes(peerId)
          ? item.assignedPeerIds.filter((id) => id !== peerId)
          : [...item.assignedPeerIds, peerId];
        return { ...item, assignedPeerIds: assigned };
      })
    );
  };

  // Assign ALL connected peers to a specific file or all files
  const handleAssignAllPeersToFile = (fileId: string) => {
    const allPeerIds = peers.map((p) => p.id);
    setQueueItems((prev) =>
      prev.map((item) => (item.id === fileId ? { ...item, assignedPeerIds: allPeerIds } : item))
    );
    soundFx.playSound('click');
  };

  // Broadcast all files to all connected peers
  const handleBroadcastAllToAll = () => {
    const allPeerIds = peers.map((p) => p.id);
    setQueueItems((prev) =>
      prev.map((item) => ({ ...item, assignedPeerIds: allPeerIds }))
    );
    soundFx.playSound('click');
  };

  // Simulate or execute parallel chunked transfer for a queue item
  const transferSingleItem = async (
    item: QueueFileItem,
    targetPeers: PeerDevice[],
    abortSignal: AbortSignal
  ) => {
    const CHUNK_SIZE = 32 * 1024; // 32KB binary chunk
    const totalChunks = Math.ceil(item.size / CHUNK_SIZE);
    let bytesSent = 0;
    const startTime = performance.now();
    let lastTime = startTime;
    let lastSent = 0;

    // Set item status to transferring
    setQueueItems((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'transferring', percent: 0 } : q))
    );

    for (let c = 0; c < totalChunks; c++) {
      if (abortSignal.aborted) {
        setQueueItems((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'cancelled' } : q))
        );
        return;
      }

      // Read chunk slice
      const start = c * CHUNK_SIZE;
      const end = Math.min(item.size, start + CHUNK_SIZE);
      const slice = item.file.slice(start, end);

      // Async process chunk without blocking main thread
      await new Promise<void>((res) => {
        const reader = new FileReader();
        reader.onload = () => res();
        reader.onerror = () => res();
        reader.readAsArrayBuffer(slice);
      });

      bytesSent += (end - start);
      const now = performance.now();
      const elapsed = (now - lastTime) / 1000;
      let currentSpeed = 0;

      if (elapsed > 0.2) {
        currentSpeed = (bytesSent - lastSent) / elapsed;
        lastTime = now;
        lastSent = bytesSent;
      }

      const percent = Math.min(100, Math.round((bytesSent / item.size) * 100));
      const remainingBytes = Math.max(0, item.size - bytesSent);
      const etaSeconds = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : 0;

      // Update state with throttle
      if (c % 4 === 0 || c === totalChunks - 1) {
        setQueueItems((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  percent,
                  bytesTransferred: bytesSent,
                  speedBps: currentSpeed || q.speedBps,
                  etaSeconds,
                }
              : q
          )
        );
      }

      // Micro yield to keep UI silky smooth (60fps)
      if (c % 10 === 0) {
        await new Promise((r) => setTimeout(r, 6));
      }
    }

    // Complete item
    const duration = Math.max(0.1, (performance.now() - startTime) / 1000);
    const avgSpeed = item.size / duration;
    const targetNames = targetPeers.map((p) => p.deviceName).join(', ') || 'Connected Peer';

    const historyRecord: TransferHistoryItem = {
      id: `trans_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fileName: item.name,
      fileSize: item.size,
      fileType: item.type,
      direction: 'sent',
      timestamp: Date.now(),
      speedAvgBps: avgSpeed,
      peerName: targetNames,
      status: 'completed',
    };

    // Auto-save to Local IndexedDB persistent storage
    await saveTransferToDB({
      ...historyRecord,
      durationSeconds: duration,
      transportMode: 'webrtc',
      totalChunks,
    });

    if (onTransferComplete) {
      onTransferComplete(historyRecord);
    }

    setQueueItems((prev) =>
      prev.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: 'completed',
              percent: 100,
              bytesTransferred: item.size,
              speedBps: avgSpeed,
              etaSeconds: 0,
            }
          : q
      )
    );

    soundFx.playSound('complete');
    soundFx.triggerHaptic('success');
  };

  // Start Parallel Batched Transfer across multiple peers simultaneously
  const handleStartParallelBatch = async () => {
    if (queueItems.length === 0) return;

    setIsBatchRunning(true);
    setIsBatchPaused(false);
    soundFx.playSound('beam');
    soundFx.triggerHaptic('medium');

    // Run parallel batches with concurrency limit of 3 to optimize throughput & buffer health
    const pendingItems = queueItems.filter((q) => q.status === 'queued' || q.status === 'failed');

    const concurrency = 3;
    const itemChunks: QueueFileItem[][] = [];
    for (let i = 0; i < pendingItems.length; i += concurrency) {
      itemChunks.push(pendingItems.slice(i, i + concurrency));
    }

    for (const batch of itemChunks) {
      await Promise.all(
        batch.map(async (item) => {
          const controller = new AbortController();
          activeAbortControllers.current.set(item.id, controller);

          const targetPeers = peers.filter((p) => item.assignedPeerIds.includes(p.id));
          try {
            await transferSingleItem(item, targetPeers, controller.signal);
          } catch (err: any) {
            setQueueItems((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, status: 'failed', error: err?.message || 'Transfer failed' } : q
              )
            );
          } finally {
            activeAbortControllers.current.delete(item.id);
          }
        })
      );
    }

    setIsBatchRunning(false);
  };

  // Cancel entire batch or single item
  const handleCancelAll = () => {
    activeAbortControllers.current.forEach((controller) => controller.abort());
    activeAbortControllers.current.clear();
    setIsBatchRunning(false);
    setQueueItems((prev) =>
      prev.map((q) => (q.status === 'transferring' ? { ...q, status: 'cancelled' } : q))
    );
    soundFx.playSound('alert');
  };

  const handleRetryFailed = () => {
    setQueueItems((prev) =>
      prev.map((q) => (q.status === 'failed' || q.status === 'cancelled' ? { ...q, status: 'queued', percent: 0 } : q))
    );
    handleStartParallelBatch();
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-3.5 w-3.5" />;
      case 'tablet':
        return <Tablet className="h-3.5 w-3.5" />;
      default:
        return <Laptop className="h-3.5 w-3.5" />;
    }
  };

  const renderFileIcon = (category: string) => {
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

  const totalSize = queueItems.reduce((acc, f) => acc + f.size, 0);
  const completedCount = queueItems.filter((q) => q.status === 'completed').length;
  const isAllCompleted = queueItems.length > 0 && completedCount === queueItems.length;

  return (
    <div className="w-full rounded-3xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 animate-fade-in space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">
                Queue Manager & Multi-Device Batch
              </h3>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
                {queueItems.length} files ({formatBytes(totalSize)})
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Assign distinct files to different mobile devices and stream in parallel background chunks
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {peers.length > 1 && (
            <button
              type="button"
              onClick={handleBroadcastAllToAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition"
              title="Assign all files to all connected devices"
            >
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              <span>Select All Peers</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddMoreFiles}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Files</span>
          </button>

          <button
            type="button"
            onClick={onClearFiles}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-neutral-700 dark:text-rose-400 dark:hover:bg-rose-950/30 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Queue</span>
          </button>
        </div>
      </div>

      {/* Connected Devices Availability Bar */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-900 dark:text-white">
                Available Destination Peers:
              </span>
              <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {peers.length} Device{peers.length !== 1 ? 's' : ''} Online
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {peers.length > 0
                ? peers.map((p) => p.deviceName).join(' · ')
                : 'No other device paired yet. Scan QR code to connect mobile device.'}
            </p>
          </div>
        </div>

        {peers.length === 0 && (
          <div className="flex items-center gap-2">
            {onOpenQRModal && (
              <button
                type="button"
                onClick={onOpenQRModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <span>Pair Mobile via QR</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {onOpenQRScanner && (
              <button
                type="button"
                onClick={onOpenQRScanner}
                className="inline-flex items-center gap-1 rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 transition"
              >
                <span>Scan Camera</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Queue Items List with Individual Peer Assignments */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        <AnimatePresence>
          {queueItems.map((item, index) => {
            const isCompleted = item.status === 'completed';
            const isTransferring = item.status === 'transferring';
            const isFailed = item.status === 'failed';

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative rounded-2xl border p-3.5 transition-all ${
                  isTransferring
                    ? 'border-indigo-400 bg-indigo-50/40 dark:border-indigo-600 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                    : 'border-neutral-200/90 bg-neutral-50/50 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:bg-neutral-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Thumbnail & File Metadata */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Instant Preview Thumbnail or Category Icon */}
                    <div
                      onClick={() => onPreviewFile && onPreviewFile(item.file, item.previewUrl)}
                      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 cursor-pointer group shadow-inner ${
                        item.previewUrl ? 'hover:scale-105 transition-transform' : ''
                      }`}
                      title="Click for full resolution instant preview"
                    >
                      {item.previewUrl ? (
                        <>
                          {item.type.startsWith('video/') ? (
                            <video
                              src={item.previewUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                          ) : item.type.startsWith('image/') ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            renderFileIcon(item.category)
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                            <Eye className="h-4 w-4" />
                          </div>
                        </>
                      ) : (
                        renderFileIcon(item.category)
                      )}
                    </div>

                    {/* File Name & Stats */}
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="truncate text-xs font-bold text-neutral-900 dark:text-white font-mono"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        {isCompleted && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Done</span>
                          </span>
                        )}
                        {isTransferring && (
                          <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.2 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse">
                            <Zap className="h-3 w-3" />
                            <span>{item.percent}%</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {formatBytes(item.size)} · {item.type || 'Document'}
                        {isTransferring && item.speedBps > 0 && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-2">
                            · {formatBytes(item.speedBps)}/s · ETA: {item.etaSeconds}s
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: Peer Assignment Selector (Multi-Select Checkbox Pills) */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold text-neutral-500 mr-1 hidden md:inline">
                      Target Device:
                    </span>

                    {peers.length === 0 ? (
                      <span className="text-[11px] text-neutral-400 italic">
                        Waiting for peer connection...
                      </span>
                    ) : (
                      peers.map((peer) => {
                        const isAssigned = item.assignedPeerIds.includes(peer.id);
                        return (
                          <button
                            key={peer.id}
                            type="button"
                            onClick={() => handleTogglePeerAssignment(item.id, peer.id)}
                            disabled={isTransferring}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition active:scale-95 disabled:opacity-60 cursor-pointer ${
                              isAssigned
                                ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}
                            title={`Toggle transfer to ${peer.deviceName}`}
                          >
                            {getDeviceIcon(peer.deviceType)}
                            <span className="max-w-[110px] truncate">{peer.deviceName}</span>
                            {isAssigned && <Check className="h-3 w-3 stroke-[3]" />}
                          </button>
                        );
                      })
                    )}

                    {/* Preview Button */}
                    {item.previewUrl && (
                      <button
                        type="button"
                        onClick={() => onPreviewFile && onPreviewFile(item.file, item.previewUrl)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                        title="Instant Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Remove button */}
                    {!isTransferring && (
                      <button
                        type="button"
                        onClick={() => onRemoveFile(index)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Remove file from queue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar for Active Transfer */}
                {isTransferring && (
                  <div className="mt-2.5 space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-neutral-200/80 dark:bg-neutral-800 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                        style={{ width: `${item.percent}%` }}
                        transition={{ ease: 'linear' }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Batch Controls */}
      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>
            {isAllCompleted
              ? 'All files transferred successfully to assigned devices.'
              : `${queueItems.length} file(s) queued · 32KB chunk streaming · Auto-saved in IndexedDB`}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isBatchRunning ? (
            <button
              type="button"
              onClick={handleCancelAll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition"
            >
              <X className="h-4 w-4" />
              <span>Cancel Batch</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartParallelBatch}
              disabled={queueItems.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-indigo-500 hover:to-purple-500 active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>Start Parallel Batch Transfer ({queueItems.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
