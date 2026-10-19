/**
 * BeamDrop IndexedDB Local History Engine
 * Provides persistent, zero-login, client-side storage for file transfer records.
 * Completely immune to page refreshes and browser memory wipes.
 */

import { TransferHistoryItem } from '../types';

const DB_NAME = 'BeamDropLocalDB';
const DB_VERSION = 2;
const STORE_NAME = 'transfer_history';

export interface ExtendedHistoryRecord extends TransferHistoryItem {
  peerId?: string;
  checksum?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  transportMode?: 'webrtc' | 'relay' | 'local-lan';
  totalChunks?: number;
  deviceType?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        } else {
          store = (event.target as any).transaction.objectStore(STORE_NAME);
        }

        // Create indexes for instant querying and sorting
        if (!store.indexNames.contains('timestamp')) {
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!store.indexNames.contains('direction')) {
          store.createIndex('direction', 'direction', { unique: false });
        }
        if (!store.indexNames.contains('status')) {
          store.createIndex('status', 'status', { unique: false });
        }
        if (!store.indexNames.contains('fileType')) {
          store.createIndex('fileType', 'fileType', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
      request.onblocked = () => console.warn('[IndexedDB] Database open blocked by another tab');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Save or update a transfer record in IndexedDB
 */
export async function saveTransferToDB(record: ExtendedHistoryRecord): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback: Could not save to IndexedDB', err);
  }
}

/**
 * Retrieve all past transfer records sorted by newest first
 */
export async function getAllTransfersFromDB(): Promise<ExtendedHistoryRecord[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      // Open cursor in descending order to get newest transfers first
      const req = index.openCursor(null, 'prev');
      const results: ExtendedHistoryRecord[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not retrieve history from IndexedDB', err);
    return [];
  }
}

/**
 * Delete a single transfer record by ID
 */
export async function deleteTransferFromDB(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('[IndexedDB] Delete failed', err);
  }
}

/**
 * Clear all transfer records in IndexedDB
 */
export async function clearAllTransfersInDB(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('[IndexedDB] Clear failed', err);
  }
}

/**
 * Export history as formatted JSON string
 */
export async function exportHistoryAsJSON(): Promise<string> {
  const records = await getAllTransfersFromDB();
  return JSON.stringify(
    {
      app: 'BeamDrop P2P Transfer',
      exportedAt: new Date().toISOString(),
      totalRecords: records.length,
      records,
    },
    null,
    2
  );
}

/**
 * Export history as CSV string for spreadsheet compatibility
 */
export async function exportHistoryAsCSV(): Promise<string> {
  const records = await getAllTransfersFromDB();
  const headers = ['ID', 'Date', 'Time', 'File Name', 'Size (Bytes)', 'Type', 'Direction', 'Peer Name', 'Status', 'Speed (Bps)'];
  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${new Date(r.timestamp).toLocaleDateString()}"`,
    `"${new Date(r.timestamp).toLocaleTimeString()}"`,
    `"${(r.fileName || '').replace(/"/g, '""')}"`,
    r.fileSize,
    `"${r.fileType || 'unknown'}"`,
    `"${r.direction}"`,
    `"${(r.peerName || 'Peer').replace(/"/g, '""')}"`,
    `"${r.status}"`,
    Math.round(r.speedAvgBps || 0),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Get cumulative aggregate statistics
 */
export async function getTransferStatistics(): Promise<{
  totalFiles: number;
  totalBytes: number;
  sentCount: number;
  receivedCount: number;
  sentBytes: number;
  receivedBytes: number;
}> {
  const records = await getAllTransfersFromDB();
  let totalBytes = 0;
  let sentCount = 0;
  let receivedCount = 0;
  let sentBytes = 0;
  let receivedBytes = 0;

  for (const r of records) {
    totalBytes += r.fileSize || 0;
    if (r.direction === 'sent') {
      sentCount++;
      sentBytes += r.fileSize || 0;
    } else {
      receivedCount++;
      receivedBytes += r.fileSize || 0;
    }
  }

  return {
    totalFiles: records.length,
    totalBytes,
    sentCount,
    receivedCount,
    sentBytes,
    receivedBytes,
  };
}
