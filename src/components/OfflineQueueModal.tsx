import React from 'react';
import {
  WifiOff,
  Wifi,
  Clock,
  Play,
  Trash2,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { OfflineQueueItem } from '../types';
import { formatBytes } from '../utils/format';

interface OfflineQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: OfflineQueueItem[];
  isOnline: boolean;
  peersCount: number;
  onResumeQueue: () => void;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
}

export const OfflineQueueModal: React.FC<OfflineQueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  isOnline,
  peersCount,
  onResumeQueue,
  onRemoveItem,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  const canResume = isOnline && peersCount > 0 && queue.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${
                !isOnline
                  ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
              }`}
            >
              {!isOnline ? <WifiOff className="h-6 w-6" /> : <Wifi className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    !isOnline
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                  }`}
                >
                  {isOnline ? 'Online Ready' : 'Device Offline'}
                </span>
                <span className="text-xs font-semibold text-neutral-400">
                  {queue.length} {queue.length === 1 ? 'file' : 'files'} waiting
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                Offline Transfer Queue
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Transfers auto-buffer when offline and commence automatically upon reconnecting.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Queue Items List */}
        <div className="overflow-y-auto my-4 space-y-2.5 pr-1 flex-1">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">Offline queue is empty</p>
              <p className="mt-1 text-[11px]">
                Any files selected while offline or awaiting peer pairing will appear here.
              </p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950/40"
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                      <span>{formatBytes(item.size)}</span>
                      <span>•</span>
                      <span>Target: {item.targetRoomId}</span>
                      {item.isSelfDestructive && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                            <Flame className="h-3 w-3" />
                            Self-destruct
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded-full bg-neutral-200/80 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    Buffered
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    title="Remove from queue"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          {queue.length > 0 ? (
            <button
              onClick={onClearQueue}
              className="text-xs font-semibold text-neutral-400 hover:text-rose-500 transition"
            >
              Clear Queue
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                onResumeQueue();
                onClose();
              }}
              disabled={!canResume}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 py-2.5 px-5 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-md disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Resume Transfers</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
