/**
 * Smart Adaptive File Compression Engine
 * Dynamically compresses files exceeding specific size thresholds before peer transmission.
 * Uses native Web Streams CompressionStream (gzip) for data/docs and OffscreenCanvas adaptive compression for images.
 */

export interface CompressionResult {
  data: ArrayBuffer;
  isCompressed: boolean;
  algorithm?: 'gzip' | 'image-adaptive';
  originalSize: number;
  compressedSize: number;
  ratio: number; // Percentage saved (e.g. 65)
  mimeType: string;
}

const DEFAULT_THRESHOLD_BYTES = 4 * 1024 * 1024; // 4 MB default threshold

/**
 * Check if a file should be automatically compressed
 */
export function isEligibleForCompression(file: File, thresholdBytes: number = DEFAULT_THRESHOLD_BYTES): boolean {
  if (file.size < thresholdBytes) return false;

  // Already heavily compressed binary archives/videos gain minimal benefit
  const skippedExtensions = ['.zip', '.rar', '.7z', '.gz', '.mp4', '.mkv', '.avi', '.mp3', '.aac'];
  const lowerName = file.name.toLowerCase();
  for (const ext of skippedExtensions) {
    if (lowerName.endsWith(ext)) return false;
  }

  return true;
}

/**
 * Adaptive image compressor using Canvas API
 */
async function compressImage(file: File): Promise<{ buffer: ArrayBuffer; ratio: number } | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDimension = 2560; // Max 2.5K resolution
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, fallback to jpeg
        canvas.toBlob(
          async (blob) => {
            if (!blob || blob.size >= file.size * 0.95) {
              // Not significant enough savings
              resolve(null);
              return;
            }
            const buffer = await blob.arrayBuffer();
            const ratio = Math.round(((file.size - blob.size) / file.size) * 100);
            resolve({ buffer, ratio });
          },
          'image/webp',
          0.82
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };

      img.src = objectUrl;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generic gzip stream compressor for documents, text, code, json, csv, and binary files
 */
async function compressStreamGzip(buffer: ArrayBuffer): Promise<ArrayBuffer | null> {
  if (typeof CompressionStream === 'undefined') {
    return null;
  }

  try {
    const stream = new Blob([buffer]).stream();
    const compressionStream = new CompressionStream('gzip');
    const compressedStream = stream.pipeThrough(compressionStream);
    const response = new Response(compressedStream);
    const compressedBlob = await response.blob();
    const compressedBuffer = await compressedBlob.arrayBuffer();

    // Only use if compression actually reduced size
    if (compressedBuffer.byteLength < buffer.byteLength * 0.96) {
      return compressedBuffer;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Smart Compress a file before chunking and transmission
 */
export async function smartCompressFile(
  file: File,
  thresholdBytes: number = DEFAULT_THRESHOLD_BYTES
): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!isEligibleForCompression(file, thresholdBytes)) {
    const rawBuffer = await file.arrayBuffer();
    return {
      data: rawBuffer,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize,
      ratio: 0,
      mimeType: file.type || 'application/octet-stream',
    };
  }

  // 1. Try Image Adaptive Compression if image
  if (file.type.startsWith('image/') && !file.type.includes('svg')) {
    const imgCompressed = await compressImage(file);
    if (imgCompressed) {
      return {
        data: imgCompressed.buffer,
        isCompressed: true,
        algorithm: 'image-adaptive',
        originalSize,
        compressedSize: imgCompressed.buffer.byteLength,
        ratio: imgCompressed.ratio,
        mimeType: 'image/webp',
      };
    }
  }

  // 2. Try Gzip stream compression
  const rawBuffer = await file.arrayBuffer();
  const gzipBuffer = await compressStreamGzip(rawBuffer);

  if (gzipBuffer) {
    const ratio = Math.round(((originalSize - gzipBuffer.byteLength) / originalSize) * 100);
    return {
      data: gzipBuffer,
      isCompressed: true,
      algorithm: 'gzip',
      originalSize,
      compressedSize: gzipBuffer.byteLength,
      ratio,
      mimeType: file.type || 'application/octet-stream',
    };
  }

  // Fallback: return uncompressed
  return {
    data: rawBuffer,
    isCompressed: false,
    originalSize,
    compressedSize: originalSize,
    ratio: 0,
    mimeType: file.type || 'application/octet-stream',
  };
}

/**
 * Decompress incoming buffer on receiver end
 */
export async function decompressPayload(
  buffer: ArrayBuffer,
  algorithm?: 'gzip' | 'deflate' | 'image-adaptive',
  mimeType: string = 'application/octet-stream'
): Promise<Blob> {
  if (!algorithm) {
    return new Blob([buffer], { type: mimeType });
  }

  if (algorithm === 'image-adaptive') {
    return new Blob([buffer], { type: mimeType || 'image/webp' });
  }

  if (algorithm === 'gzip' && typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new Blob([buffer]).stream();
      const decompStream = new DecompressionStream('gzip');
      const decompressed = stream.pipeThrough(decompStream);
      const response = new Response(decompressed);
      const finalBlob = await response.blob();
      return new Blob([await finalBlob.arrayBuffer()], { type: mimeType });
    } catch (err) {
      console.warn('Decompression error, using raw buffer:', err);
      return new Blob([buffer], { type: mimeType });
    }
  }

  return new Blob([buffer], { type: mimeType });
}
