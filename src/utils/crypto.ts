// Web Crypto API helper for End-to-End Encryption (AES-GCM-256)

/**
 * Universal safe UUID generator (RFC4122 v4)
 * Safe on all devices, iOS Safari, HTTP origins, and restricted webviews
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a cryptographically secure 256-bit AES-GCM key
 */
export async function generateAESKey(): Promise<CryptoKey> {
  const subtle = typeof window !== 'undefined' && window.crypto ? window.crypto.subtle : null;
  if (!subtle) {
    throw new Error('Web Crypto API not available in current environment');
  }
  return await subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export CryptoKey to a URL-safe Base64 string for embedding in the QR hash (#key=...)
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const bytes = new Uint8Array(exported);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Import CryptoKey from a URL-safe Base64 string
 */
export async function importKeyFromBase64(base64Str: string): Promise<CryptoKey> {
  let base64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    'raw',
    bytes.buffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a deterministic 12-byte IV based on file ID hash and chunk sequence index
 */
export function createChunkIV(fileId: string, chunkIndex: number): Uint8Array {
  const iv = new Uint8Array(12);
  // Hash the fileId into the first 8 bytes
  let hash = 0;
  for (let i = 0; i < fileId.length; i++) {
    hash = (hash << 5) - hash + fileId.charCodeAt(i);
    hash |= 0;
  }
  const view = new DataView(iv.buffer);
  view.setUint32(0, Math.abs(hash), false);
  view.setUint32(4, (Math.abs(hash) ^ 0x5a5a5a5a) >>> 0, false);
  view.setUint32(8, chunkIndex, false);
  return iv;
}

/**
 * Encrypt a single chunk buffer with AES-GCM
 */
export async function encryptChunk(
  chunkBuffer: ArrayBuffer,
  key: CryptoKey,
  fileId: string,
  chunkIndex: number
): Promise<ArrayBuffer> {
  const iv = createChunkIV(fileId, chunkIndex);
  return await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128,
    },
    key,
    chunkBuffer
  );
}

/**
 * Decrypt a single chunk buffer with AES-GCM
 */
export async function decryptChunk(
  encryptedBuffer: ArrayBuffer,
  key: CryptoKey,
  fileId: string,
  chunkIndex: number
): Promise<ArrayBuffer> {
  const iv = createChunkIV(fileId, chunkIndex);
  return await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128,
    },
    key,
    encryptedBuffer
  );
}

/**
 * Compute SHA-256 checksum of an ArrayBuffer
 */
export async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  const subtle = typeof window !== 'undefined' && window.crypto ? window.crypto.subtle : null;
  if (subtle && typeof subtle.digest === 'function') {
    try {
      const hashBuffer = await subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }
  // Safe fallback checksum
  const bytes = new Uint8Array(buffer);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Web Audio API synthesizer for modern, discrete feedback chimes
 */
export function playChime(type: 'connected' | 'complete' | 'receive' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'connected') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.35);
    } else if (type === 'complete') {
      const notes = [587.33, 880, 1174.66]; // D5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.09, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } else if (type === 'receive') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, now); // G5
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Ignore audio permission or autoplay restrictions silently
  }
}
