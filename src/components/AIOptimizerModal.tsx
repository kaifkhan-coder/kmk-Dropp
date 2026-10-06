import React from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Layers,
  Sparkles,
  X,
  Gauge,
  ArrowUpRight,
  Database,
} from 'lucide-react';
import { NetworkTelemetry } from '../types';
import { formatBytes } from '../utils/format';

interface AIOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: NetworkTelemetry;
}

export const AIOptimizerModal: React.FC<AIOptimizerModalProps> = ({
  isOpen,
  onClose,
  telemetry,
}) => {
  if (!isOpen) return null;

  const bandwidthMbps = (telemetry.bandwidthBps / 1_000_000).toFixed(1);
  const throughputMbps = (telemetry.expectedThroughputBps / 1_000_000).toFixed(1);
  const diskWriteMBps = (telemetry.diskWriteSpeedBps / 8_000_000).toFixed(1);
  const lossPercent = (telemetry.packetLossRate * 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 uppercase tracking-wider">
                  AI Adaptive Network Engine
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Health: {telemetry.networkHealthScore}/100
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                Real-Time Telemetry & Heuristic Optimization
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Continuous dynamic parameter tuning based on live network & hardware performance.
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

        {/* Content Body */}
        <div className="overflow-y-auto my-4 space-y-4 pr-1 flex-1">
          {/* Top 4 Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Bandwidth */}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                <Wifi className="h-3.5 w-3.5 text-indigo-500" />
                <span>Bandwidth</span>
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-white">
                {bandwidthMbps} <span className="text-xs font-normal text-neutral-400">Mbps</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Live link speed</div>
            </div>

            {/* Latency & Jitter */}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                <span>RTT / Jitter</span>
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-white">
                {telemetry.latencyMs} <span className="text-xs font-normal text-neutral-400">ms</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Jitter: ±{telemetry.jitterMs}ms</div>
            </div>

            {/* Packet Loss */}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Packet Loss</span>
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-white">
                {lossPercent}%
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">{telemetry.chunkFailureCount} retries</div>
            </div>

            {/* CPU & Disk */}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                <Cpu className="h-3.5 w-3.5 text-rose-500" />
                <span>CPU / Disk</span>
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-white">
                {telemetry.cpuUtilizationPercent}%
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Disk: {diskWriteMBps} MB/s</div>
            </div>
          </div>

          {/* AI Dynamic Estimation Card */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                  AI-Estimated Optimal Stream Parameters
                </h4>
              </div>
              <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                Self-Tuning Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-white/80 p-3 dark:bg-neutral-900/80 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-neutral-500 dark:text-neutral-400 text-[11px] mb-0.5">Optimal Chunk Size</div>
                <div className="text-base font-bold text-neutral-900 dark:text-white font-mono">
                  {formatBytes(telemetry.optimalChunkSize)}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Prevents buffer overflow and avoids packet fragmentation.
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-3 dark:bg-neutral-900/80 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-neutral-500 dark:text-neutral-400 text-[11px] mb-0.5">Parallel Streams</div>
                <div className="text-base font-bold text-neutral-900 dark:text-white font-mono">
                  {telemetry.optimalParallelStreams} concurrent channels
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Multiplexed WebRTC & WebSocket relay pipeline.
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-3 dark:bg-neutral-900/80 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-neutral-500 dark:text-neutral-400 text-[11px] mb-0.5">Expected Throughput</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ~{throughputMbps} Mbps
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Factoring in jitter, packet retransmissions & encryption cost.
                </p>
              </div>
            </div>
          </div>

          {/* Architecture Pillars: Checkpointing, CAS & Zero-Knowledge */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Architectural Security & Reliability Pillars
            </h4>

            {/* Pillar 1: Transfer Checkpointing */}
            <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                  <span>Transfer Checkpointing</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Enabled</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Interrupted transfers seamlessly resume from the last verified chunk offset without re-transferring previously received data.
                </p>
              </div>
            </div>

            {/* Pillar 2: Delta Transfer & Content Addressable Storage (CAS) */}
            <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 shrink-0">
                <Database className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                  <span>Delta Transfer & Content Addressable Storage (CAS)</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Active</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Partitions data into 64KB content-addressable blocks. Deduplicates identical blocks locally so only modified or missing bytes are transferred over the wire.
                </p>
              </div>
            </div>

            {/* Pillar 3: Zero-Knowledge Architecture */}
            <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                  <span>Zero-Knowledge Transfer Architecture</span>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Strict E2EE</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  The server knows as little as possible. Chunks are encrypted with client-side AES-GCM-256 before leaving your device. Relay nodes only see opaque binary buffers without file names, sizes, or keys.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-900 py-2.5 px-5 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
