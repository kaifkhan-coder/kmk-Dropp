import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  X,
  Check,
  Shield,
  Zap,
  ArrowDown,
  ArrowUp,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TransferProgress } from '../types';
import { formatBytes, formatSpeed, formatETA } from '../utils/format';

interface TransferProgressViewProps {
  progress: TransferProgress;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
  onReset: () => void;
}

interface ThroughputPoint {
  time: string;
  mbps: number;
  rawBytesPerSec: number;
  percent: number;
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

  const [history, setHistory] = useState<ThroughputPoint[]>([]);
  const [showChart, setShowChart] = useState(true);
  const startTimeRef = useRef<number>(Date.now());
  const maxPoints = 30;

  // Track real-time throughput samples in MB/s
  useEffect(() => {
    if (isCancelled || isFailed) return;

    const currentMbps = isPaused
      ? 0
      : Number((progress.speedBps / (1024 * 1024)).toFixed(2));

    const elapsedSeconds = Math.max(
      0.1,
      Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1))
    );

    const newPoint: ThroughputPoint = {
      time: `${elapsedSeconds}s`,
      mbps: currentMbps,
      rawBytesPerSec: progress.speedBps,
      percent: progress.percent,
    };

    setHistory((prev) => {
      const updated = [...prev, newPoint];
      if (updated.length > maxPoints) {
        return updated.slice(updated.length - maxPoints);
      }
      return updated;
    });
  }, [progress.speedBps, progress.bytesTransferred, isPaused, isCancelled, isFailed]);

  // Compute peak and average throughput
  const currentMbps = isPaused
    ? 0
    : Number((progress.speedBps / (1024 * 1024)).toFixed(2));

  const peakMbps = history.length > 0
    ? Math.max(...history.map((p) => p.mbps), currentMbps)
    : currentMbps;

  const totalElapsedSec = Math.max(1, (Date.now() - startTimeRef.current) / 1000);
  const avgMbps = progress.bytesTransferred > 0
    ? Number(((progress.bytesTransferred / (1024 * 1024)) / totalElapsedSec).toFixed(2))
    : currentMbps;

  // Initial placeholder point if empty
  const chartData = history.length > 0
    ? history
    : [{ time: '0s', mbps: 0, rawBytesPerSec: 0, percent: 0 }];

  return (
    <div className="w-full rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 transition">
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
                : 'bg-indigo-600 dark:bg-indigo-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
          />
        </div>
      </div>

      {/* Real-Time Recharts Throughput Line Chart Section */}
      <div className="mt-5 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>Real-Time Transfer Throughput</span>
                {!isComplete && !isPaused && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed Badges */}
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px]">
              <span className="rounded-lg bg-white px-2 py-0.5 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">
                Current: <strong className="text-indigo-600 dark:text-indigo-400">{currentMbps.toFixed(2)} MB/s</strong>
              </span>
              <span className="rounded-lg bg-white px-2 py-0.5 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">
                Peak: <strong className="text-emerald-600 dark:text-emerald-400">{peakMbps.toFixed(2)} MB/s</strong>
              </span>
              <span className="rounded-lg bg-white px-2 py-0.5 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">
                Avg: <strong className="text-amber-600 dark:text-amber-400">{avgMbps.toFixed(2)} MB/s</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className="rounded-lg p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              title={showChart ? 'Minimize Chart' : 'Expand Chart'}
            >
              {showChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Speed Badges Row */}
        <div className="flex sm:hidden items-center justify-between gap-1.5 font-mono text-[10px] mb-2">
          <span className="rounded-lg bg-white px-1.5 py-0.5 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">
            Current: <strong className="text-indigo-600 dark:text-indigo-400">{currentMbps.toFixed(2)} MB/s</strong>
          </span>
          <span className="rounded-lg bg-white px-1.5 py-0.5 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">
            Peak: <strong className="text-emerald-600 dark:text-emerald-400">{peakMbps.toFixed(2)} MB/s</strong>
          </span>
          <span className="rounded-lg bg-white px-1.5 py-0.5 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">
            Avg: <strong className="text-amber-600 dark:text-amber-400">{avgMbps.toFixed(2)} MB/s</strong>
          </span>
        </div>

        {/* Recharts Chart Container */}
        {showChart && (
          <div className="h-36 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isSending ? '#6366f1' : '#10b981'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={isSending ? '#6366f1' : '#10b981'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" opacity={0.6} />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#888888' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#888888' }}
                  unit=" M"
                  domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax * 1.25))]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ThroughputPoint;
                      return (
                        <div className="rounded-xl border border-neutral-200 bg-white/95 p-2 shadow-lg backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/95 text-[11px] font-mono space-y-1">
                          <p className="font-sans font-bold text-neutral-900 dark:text-white">
                            Time: {data.time} ({data.percent}%)
                          </p>
                          <p className="text-indigo-600 dark:text-indigo-400 font-bold">
                            Speed: {data.mbps.toFixed(2)} MB/s
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {(data.mbps * 8).toFixed(1)} Mbps bandwidth
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="mbps"
                  stroke={isSending ? '#6366f1' : '#10b981'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#throughputGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
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
