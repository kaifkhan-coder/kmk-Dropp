/**
 * Offline Transfer Queue Manager
 * Automatically buffers and preserves transfers when the device goes offline or peers disconnect.
 * Resumes transfers seamlessly as soon as network connectivity is restored and peers reconnect.
 */

import { OfflineQueueItem } from '../types';
import { safeLocalStorage } from './storage';
import { generateUUID } from './crypto';

type QueueListener = (items: OfflineQueueItem[]) => void;

class OfflineQueueManager {
  private queue: OfflineQueueItem[] = [];
  private listeners: Set<QueueListener> = new Set();
  public isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    this.loadFromStorage();
    this.setupNetworkListeners();
  }

  private loadFromStorage() {
    try {
      const saved = safeLocalStorage.getItem('beamdrop_offline_queue_meta');
      if (saved) {
        // Files themselves cannot be serialized to localStorage, but metadata is tracked
        const metaList = JSON.parse(saved);
        this.queue = metaList.filter((i: any) => i.file instanceof File);
      }
    } catch {
      this.queue = [];
    }
  }

  private persistMeta() {
    try {
      const serializable = this.queue.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        type: item.type,
        addedAt: item.addedAt,
        targetRoomId: item.targetRoomId,
        status: item.status,
        checkpointChunkIndex: item.checkpointChunkIndex,
        totalChunks: item.totalChunks,
        isSelfDestructive: item.isSelfDestructive,
        expiresInMinutes: item.expiresInMinutes,
      }));
      safeLocalStorage.setItem('beamdrop_offline_queue_meta', JSON.stringify(serializable));
    } catch {
      // ignore storage error
    }
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notify();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notify();
    });
  }

  public enqueue(
    file: File,
    targetRoomId: string,
    totalChunks: number,
    options?: { isSelfDestructive?: boolean; expiresInMinutes?: number }
  ): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: `queue_${generateUUID()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      addedAt: Date.now(),
      targetRoomId,
      status: 'queued_offline',
      checkpointChunkIndex: 0,
      totalChunks,
      isSelfDestructive: options?.isSelfDestructive,
      expiresInMinutes: options?.expiresInMinutes,
    };

    this.queue.push(item);
    this.persistMeta();
    this.notify();
    return item;
  }

  public getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  public updateItem(id: string, updates: Partial<OfflineQueueItem>): void {
    this.queue = this.queue.map((item) => (item.id === id ? { ...item, ...updates } : item));
    this.persistMeta();
    this.notify();
  }

  public remove(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.persistMeta();
    this.notify();
  }

  public clear(): void {
    this.queue = [];
    this.persistMeta();
    this.notify();
  }

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn([...this.queue]);
      } catch (err) {
        console.error('Error in offline queue listener:', err);
      }
    });
  }
}

export const offlineQueue = new OfflineQueueManager();
