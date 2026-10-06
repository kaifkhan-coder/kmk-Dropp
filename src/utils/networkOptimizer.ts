/**
 * AI-Based Network Optimization & Telemetry Engine
 * Collects live signals: bandwidth, latency, jitter, packet loss, CPU utilization, disk write speed, and chunk failures.
 * Dynamically computes optimal chunk size, parallel streams, expected throughput, and network health score.
 * Features: Transfer Checkpointing, Delta Transfer, and Content Addressable Storage (CAS).
 */

import { NetworkTelemetry } from '../types';
import { safeLocalStorage } from './storage';

export class NetworkOptimizer {
  private rttHistory: number[] = [];
  private lastRtt: number = 25;
  private totalChunksSent: number = 0;
  private failedChunksCount: number = 0;
  private recentBandwidths: number[] = []; // bps
  private recentDiskWrites: number[] = []; // bps
  private lastCpuMeasure: number = 0;
  private cpuUtilization: number = 15; // default moderate CPU
  private casBlockStore = new Map<string, ArrayBuffer>(); // Content Addressable Storage block cache

  constructor() {
    this.startCpuMonitoring();
  }

  /**
   * Monitor event-loop lag to approximate CPU utilization
   */
  private startCpuMonitoring() {
    if (typeof window === 'undefined') return;

    let lastFrameTime = performance.now();
    const checkLoop = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      lastFrameTime = now;

      // Expected ~16.6ms for 60fps. Delta > 25ms indicates heavy CPU work/lag
      const lag = Math.max(0, delta - 16.6);
      const instantCpu = Math.min(100, Math.round((lag / 33.3) * 100));
      this.cpuUtilization = Math.round(this.cpuUtilization * 0.85 + instantCpu * 0.15);

      if (now - this.lastCpuMeasure > 1000) {
        this.lastCpuMeasure = now;
      }
      requestAnimationFrame(checkLoop);
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(checkLoop);
    }
  }

  /**
   * Record Ping / Pong RTT measurement
   */
  public recordPing(rttMs: number): void {
    const cleanRtt = Math.max(1, Math.min(rttMs, 3000));
    this.rttHistory.push(cleanRtt);
    if (this.rttHistory.length > 20) {
      this.rttHistory.shift();
    }
    this.lastRtt = cleanRtt;
  }

  /**
   * Record chunk transmission speed
   */
  public recordChunkTransferred(bytes: number, durationMs: number): void {
    this.totalChunksSent++;
    if (durationMs > 0 && bytes > 0) {
      const bps = (bytes / (durationMs / 1000)) * 8;
      this.recentBandwidths.push(bps);
      if (this.recentBandwidths.length > 15) {
        this.recentBandwidths.shift();
      }
    }
  }

  /**
   * Record chunk transmission failure / retransmission
   */
  public recordChunkFailure(): void {
    this.failedChunksCount++;
  }

  /**
   * Record local disk write / assembly speed
   */
  public recordDiskWrite(bytes: number, durationMs: number): void {
    if (durationMs > 0 && bytes > 0) {
      const bps = (bytes / (durationMs / 1000)) * 8;
      this.recentDiskWrites.push(bps);
      if (this.recentDiskWrites.length > 10) {
        this.recentDiskWrites.shift();
      }
    }
  }

  /**
   * Compute comprehensive telemetry metrics & dynamic tuning parameters
   */
  public getTelemetry(): NetworkTelemetry {
    // 1. Latency (Moving Average)
    const latencyMs =
      this.rttHistory.length > 0
        ? Math.round(this.rttHistory.reduce((a, b) => a + b, 0) / this.rttHistory.length)
        : this.lastRtt;

    // 2. Jitter (|RTT_n - RTT_{n-1}| deviation)
    let jitterMs = 2;
    if (this.rttHistory.length > 1) {
      let sumDiff = 0;
      for (let i = 1; i < this.rttHistory.length; i++) {
        sumDiff += Math.abs(this.rttHistory[i] - this.rttHistory[i - 1]);
      }
      jitterMs = Math.round(sumDiff / (this.rttHistory.length - 1));
    }

    // 3. Packet / Chunk Loss Rate
    const packetLossRate =
      this.totalChunksSent > 0
        ? Math.min(1, Number((this.failedChunksCount / (this.totalChunksSent + this.failedChunksCount)).toFixed(4)))
        : 0;

    // 4. Bandwidth
    const bandwidthBps =
      this.recentBandwidths.length > 0
        ? Math.round(this.recentBandwidths.reduce((a, b) => a + b, 0) / this.recentBandwidths.length)
        : 8_000_000; // 8 Mbps initial baseline

    // 5. Disk write speed
    const diskWriteSpeedBps =
      this.recentDiskWrites.length > 0
        ? Math.round(this.recentDiskWrites.reduce((a, b) => a + b, 0) / this.recentDiskWrites.length)
        : 35_000_000; // ~35 Mbps assembly speed

    // 6. AI Adaptive Dynamic Tuning (Chunk Size & Parallel Streams)
    let optimalChunkSize = 32 * 1024; // 32 KB baseline
    let optimalParallelStreams = 1;

    // High performance / Gigabit LAN / Ultra Low Latency
    if (latencyMs < 35 && jitterMs < 10 && packetLossRate < 0.005 && this.cpuUtilization < 70) {
      if (bandwidthBps > 40_000_000) {
        optimalChunkSize = 128 * 1024; // 128 KB
        optimalParallelStreams = 4;
      } else if (bandwidthBps > 15_000_000) {
        optimalChunkSize = 64 * 1024; // 64 KB
        optimalParallelStreams = 2;
      }
    } else if (latencyMs > 180 || jitterMs > 60 || packetLossRate > 0.03 || this.cpuUtilization > 85) {
      // Degraded / Jittery network -> reduce chunk size to prevent timeouts
      optimalChunkSize = 16 * 1024; // 16 KB
      optimalParallelStreams = 1;
    } else {
      optimalChunkSize = 32 * 1024; // 32 KB
      optimalParallelStreams = 2;
    }

    // 7. Expected Throughput
    const expectedThroughputBps = Math.round(bandwidthBps * (1 - packetLossRate * 1.5));

    // 8. Overall Network Health Score (0 - 100)
    let health = 100;
    if (latencyMs > 40) health -= Math.min(30, Math.round((latencyMs - 40) / 5));
    if (jitterMs > 15) health -= Math.min(25, Math.round((jitterMs - 15) / 2));
    if (packetLossRate > 0.01) health -= Math.min(35, Math.round(packetLossRate * 500));
    if (this.cpuUtilization > 80) health -= 15;
    const networkHealthScore = Math.max(10, Math.min(100, health));

    return {
      bandwidthBps,
      latencyMs,
      jitterMs,
      packetLossRate,
      cpuUtilizationPercent: this.cpuUtilization,
      diskWriteSpeedBps,
      chunkFailureCount: this.failedChunksCount,
      optimalChunkSize,
      optimalParallelStreams,
      expectedThroughputBps,
      networkHealthScore,
      timestamp: Date.now(),
    };
  }

  // -------------------------------------------------------------
  // TRANSFER CHECKPOINTING
  // -------------------------------------------------------------

  /**
   * Save transfer progress checkpoint in persistent safeStorage
   */
  public saveCheckpoint(fileId: string, chunkIndex: number, totalChunks: number): void {
    try {
      safeLocalStorage.setItem(
        `beamdrop_checkpoint_${fileId}`,
        JSON.stringify({
          chunkIndex,
          totalChunks,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore storage error
    }
  }

  /**
   * Retrieve saved checkpoint chunk index for interrupted transfer
   */
  public getCheckpoint(fileId: string): number {
    try {
      const data = safeLocalStorage.getItem(`beamdrop_checkpoint_${fileId}`);
      if (data) {
        const parsed = JSON.parse(data);
        // Valid for up to 24 hours
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.chunkIndex || 0;
        }
      }
    } catch {
      // ignore
    }
    return 0;
  }

  /**
   * Clear checkpoint upon successful completion or cancellation
   */
  public clearCheckpoint(fileId: string): void {
    try {
      safeLocalStorage.removeItem(`beamdrop_checkpoint_${fileId}`);
    } catch {}
  }

  // -------------------------------------------------------------
  // CONTENT ADDRESSABLE STORAGE (CAS) & DELTA TRANSFERS
  // -------------------------------------------------------------

  /**
   * Partition buffer into 64KB Content-Addressable Blocks and compute block hashes
   */
  public async computeCASBlockHashes(buffer: ArrayBuffer): Promise<{ hashes: string[]; blockSize: number }> {
    const BLOCK_SIZE = 64 * 1024; // 64 KB per CAS block
    const totalBlocks = Math.ceil(buffer.byteLength / BLOCK_SIZE);
    const hashes: string[] = [];

    for (let i = 0; i < totalBlocks; i++) {
      const start = i * BLOCK_SIZE;
      const end = Math.min(start + BLOCK_SIZE, buffer.byteLength);
      const slice = buffer.slice(start, end);

      // Fast deterministic block fingerprint
      const bytes = new Uint8Array(slice);
      let h1 = 0x811c9dc5;
      for (let j = 0; j < bytes.length; j++) {
        h1 ^= bytes[j];
        h1 = (h1 * 0x01000193) >>> 0;
      }
      hashes.push(`cas_${h1.toString(16).padStart(8, '0')}_${bytes.length}`);
    }

    return { hashes, blockSize: BLOCK_SIZE };
  }

  /**
   * Store block in local Content Addressable Storage
   */
  public storeCASBlock(blockHash: string, blockBuffer: ArrayBuffer): void {
    this.casBlockStore.set(blockHash, blockBuffer);
    // Keep CAS cache bounded to 100MB
    if (this.casBlockStore.size > 1500) {
      const firstKey = this.casBlockStore.keys().next().value;
      if (firstKey) this.casBlockStore.delete(firstKey);
    }
  }

  /**
   * Check which blocks already exist locally (Delta Transfer detection)
   */
  public filterMissingCASBlocks(blockHashes: string[]): { missingIndices: number[]; cachedCount: number } {
    const missingIndices: number[] = [];
    let cachedCount = 0;

    for (let i = 0; i < blockHashes.length; i++) {
      if (this.casBlockStore.has(blockHashes[i])) {
        cachedCount++;
      } else {
        missingIndices.push(i);
      }
    }

    return { missingIndices, cachedCount };
  }

  /**
   * Get cached block buffer from CAS
   */
  public getCASBlock(blockHash: string): ArrayBuffer | undefined {
    return this.casBlockStore.get(blockHash);
  }
}

export const networkOptimizer = new NetworkOptimizer();
