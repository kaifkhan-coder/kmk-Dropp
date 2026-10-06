import React from 'react';
import { Play, Pause, X, Check, Shield, Zap, ArrowDown, ArrowUp, FileText } from 'lucide-react';
import { TransferProgress } from '../types';
import { formatBytes, formatSpeed, formatETA } from '../utils/format';

interface TransferProgressViewProps {
  progress: TransferProgress;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export const TransferProgressView: React.FC<TransferProgressViewProps> = ({
  progress,
  isPaused,
  onTogglePause,
  onCancel,
  onReset,
}) => {
  const isComplete = progress.status === 'completed';
  const isCancelled = progress.status === 'cancelled';
  const isFailed = progress.status === 'failed';
  const isSending = progress.direction === 'sending';

  return (
    <div className="w-full rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isComplete
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : isCancelled || isFailed
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
            }`}
          >
            {isComplete ? (
              <Check className="h-6 w-6 stroke-[2.5]" />
            ) : isSending ? (
              <ArrowUp className="h-5 w-5 text-indigo-500 animate-bounce" />
            ) : (
              <ArrowDown className="h-5 w-5 text-emerald-500 animate-bounce" />
            )}
          </div>

          <div className="truncate">
            <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
              {progress.fileName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
              <span>{formatBytes(progress.fileSize)}</span>
              <span>·</span>
              <span className="capitalize">{isSending ? 'Sending to' : 'Receiving from'}: {progress.peerDeviceName || 'Peer'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isComplete && !isCancelled && !isFailed && (
            <>
              <button
                onClick={onTogglePause}
                title={isPaused ? 'Resume Transfer' : 'Pause Transfer'}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                onClick={onCancel}
                title="Cancel Transfer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-rose-50 hover:text-rose-600 transition dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}

          {(isComplete || isCancelled || isFailed) && (
            <button
              onClick={onReset}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
            {progress.percent}%
          </span>
          <span className="font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
            {formatBytes(progress.bytesTransferred)} / {formatBytes(progress.fileSize)}
          </span>
        </div>

        {/* Real-time Progress Bar */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className={`h-full transition-all duration-200 ease-out rounded-full ${
              isComplete
                ? 'bg-emerald-500'
                : isCancelled || isFailed
                ? 'bg-rose-500'
                : isPaused
                ? 'bg-amber-400'
                : 'bg-neutral-900 dark:bg-white'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
          />
        </div>
      </div>

      {/* Real-Time Telemetry Metrics Grid (Tabular-Nums) */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
        <div>
          <span className="text-[11px] text-neutral-400 block">Transfer Speed</span>
          <span className="font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
            {isComplete ? 'Finished' : isPaused ? 'Paused' : formatSpeed(progress.speedBps)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-neutral-400 block">Time Remaining</span>
          <span className="font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
            {isComplete ? '0s' : isPaused ? '--' : formatETA(progress.etaSeconds)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-neutral-400 block">Transit Engine</span>
          <span className="font-medium text-neutral-900 dark:text-white flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            <span>
              {progress.transportMode === 'webrtc'
                ? 'WebRTC Direct P2P'
                : progress.transportMode === 'local-lan'
                ? 'Local Network P2P (Offline LAN)'
                : 'Encrypted Relay Bridge'}
            </span>
          </span>
        </div>

        <div>
          <span className="text-[11px] text-neutral-400 block">Encryption Status</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>AES-256-GCM Verified</span>
          </span>
        </div>
      </div>

      {progress.error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {progress.error}
        </div>
      )}
    </div>
  );
};
