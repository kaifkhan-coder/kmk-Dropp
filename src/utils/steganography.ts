/**
 * BeamDrop Advanced Client-Side Steganography Engine
 * 
 * Embeds and extracts secret data (text, confidential files, docs, photos)
 * into innocent-looking cover images using 1-bit Least Significant Bit (LSB)
 * encoding across RGB channels with optional zero-knowledge AES-256-GCM encryption.
 */

// Magic prefix identifying BeamDrop steganography carrier images
export const STEGO_MAGIC = 'BEAMSTEG1';

export interface StegoMetadata {
  type: 'text' | 'file';
  name?: string;
  mimeType?: string;
  size: number;
  encrypted: boolean;
  saltHex?: string;
  ivHex?: string;
  checksum: number;
  timestamp: number;
}

export interface StegoDecodedResult {
  type: 'text' | 'file';
  text?: string;
  file?: File;
  name?: string;
  mimeType?: string;
  size: number;
  encrypted: boolean;
  timestamp: number;
}

// Simple CRC32 for data integrity check
export function crc32(buffer: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

// Convert bytes to hex
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex to bytes
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derive AES-256-GCM key using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt bytes with password using AES-256-GCM
 */
async function encryptPayload(data: Uint8Array, password: string): Promise<{
  cipherData: Uint8Array;
  saltHex: string;
  ivHex: string;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    cipherData: new Uint8Array(encryptedBuffer),
    saltHex: toHex(salt),
    ivHex: toHex(iv),
  };
}

/**
 * Decrypt bytes with password using AES-256-GCM
 */
async function decryptPayload(
  cipherData: Uint8Array,
  password: string,
  saltHex: string,
  ivHex: string
): Promise<Uint8Array> {
  const salt = fromHex(saltHex);
  const iv = fromHex(ivHex);
  const key = await deriveKey(password, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherData
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Generates an aesthetic cover image canvas if the user doesn't upload one
 */
export function generateCoverCanvas(
  theme: 'nebula' | 'cyber' | 'waves' | 'sunset' | 'prism' | 'emerald',
  width = 960,
  height = 720
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (theme === 'nebula') {
    // Deep Space Cosmic Nebula
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.45, 80, width * 0.5, height * 0.5, width * 0.8);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(0.35, '#7c3aed');
    grad.addColorStop(0.7, '#1e1b4b');
    grad.addColorStop(1, '#050510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Starfield & glowing nebulas
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 2.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === 'cyber') {
    // Cyberpunk Dark Tech Grid
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Neon grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Glowing circuits
    const g = ctx.createLinearGradient(0, height, width, 0);
    g.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
    g.addColorStop(1, 'rgba(6, 182, 212, 0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  } else if (theme === 'waves') {
    // Elegant Ocean Wave Gradients
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.4, '#0f766e');
    grad.addColorStop(0.8, '#064e3b');
    grad.addColorStop(1, '#022c22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(width * (0.2 + i * 0.15), height * 0.6, 260, 140, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === 'sunset') {
    // Vibrant Sunset Horizon
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#f97316');
    grad.addColorStop(0.35, '#ec4899');
    grad.addColorStop(0.75, '#4338ca');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Sun disc
    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.4, 90, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme === 'prism') {
    // Minimalist Geometric Prism
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(0.5, '#a855f7');
    grad.addColorStop(1, '#ec4899');

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = grad;
    ctx.fillRect(-220, -220, 440, 440);
    ctx.restore();
  } else {
    // Emerald Forest Security
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(0.5, '#059669');
    grad.addColorStop(1, '#064e3b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  return canvas;
}

/**
 * Calculates theoretical byte capacity for a given image size
 * Each pixel has 3 bits available (R, G, B channels, Alpha untouched).
 * 8 bits = 1 byte -> Capacity = (width * height * 3) / 8 bytes.
 */
export function calculateCapacity(width: number, height: number): {
  totalBytes: number;
  usableBytes: number;
} {
  const totalBits = width * height * 3;
  const totalBytes = Math.floor(totalBits / 8);
  // Subtract 1024 bytes for header and JSON metadata buffer
  const usableBytes = Math.max(0, totalBytes - 1024);
  return { totalBytes, usableBytes };
}

/**
 * Loads an image File or Blob into an HTMLCanvasElement
 */
export async function loadImageToCanvas(file: File | Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error('Failed to get 2D context'));
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode cover image'));
    };
    img.src = url;
  });
}

/**
 * Quick Probe: Detects if an image File contains BeamDrop steganography header
 * Checks first 120 pixels in LSB mode without decoding entire payload.
 */
export async function isSteganographyImage(file: File | Blob): Promise<boolean> {
  try {
    const canvas = await loadImageToCanvas(file);
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Check first 128 pixels (384 channel bits = 48 bytes)
    const probePixels = Math.min(128, canvas.width * canvas.height);
    const imgData = ctx.getImageData(0, 0, Math.min(canvas.width, probePixels), Math.ceil(probePixels / canvas.width));
    const data = imgData.data;

    let bitIndex = 0;
    const extractedBytes: number[] = [];
    let currentByte = 0;

    for (let i = 0; i < data.length && extractedBytes.length < STEGO_MAGIC.length; i += 4) {
      // R
      currentByte = (currentByte << 1) | (data[i] & 1);
      bitIndex++;
      if (bitIndex % 8 === 0) {
        extractedBytes.push(currentByte);
        currentByte = 0;
      }
      if (extractedBytes.length >= STEGO_MAGIC.length) break;

      // G
      currentByte = (currentByte << 1) | (data[i + 1] & 1);
      bitIndex++;
      if (bitIndex % 8 === 0) {
        extractedBytes.push(currentByte);
        currentByte = 0;
      }
      if (extractedBytes.length >= STEGO_MAGIC.length) break;

      // B
      currentByte = (currentByte << 1) | (data[i + 2] & 1);
      bitIndex++;
      if (bitIndex % 8 === 0) {
        extractedBytes.push(currentByte);
        currentByte = 0;
      }
      if (extractedBytes.length >= STEGO_MAGIC.length) break;
    }

    const decodedMagic = String.fromCharCode(...extractedBytes);
    return decodedMagic === STEGO_MAGIC;
  } catch {
    return false;
  }
}

/**
 * Encodes secret data (Text or File) into a cover image using LSB steganography
 */
export async function encodeDataToImage(params: {
  coverImage?: File | HTMLCanvasElement;
  coverTheme?: 'nebula' | 'cyber' | 'waves' | 'sunset' | 'prism' | 'emerald';
  textPayload?: string;
  filePayload?: File;
  password?: string;
  outputName?: string;
}): Promise<{
  stegoFile: File;
  previewUrl: string;
  metadata: StegoMetadata;
  dimensions: { width: number; height: number };
}> {
  const { coverImage, coverTheme = 'nebula', textPayload, filePayload, password, outputName } = params;

  // 1. Prepare Raw Payload Bytes
  let rawBytes: Uint8Array;
  let metadata: StegoMetadata;

  if (filePayload) {
    const arrayBuf = await filePayload.arrayBuffer();
    rawBytes = new Uint8Array(arrayBuf);
    metadata = {
      type: 'file',
      name: filePayload.name,
      mimeType: filePayload.type || 'application/octet-stream',
      size: rawBytes.length,
      encrypted: Boolean(password && password.trim()),
      checksum: crc32(rawBytes),
      timestamp: Date.now(),
    };
  } else {
    const text = textPayload || '';
    rawBytes = new TextEncoder().encode(text);
    metadata = {
      type: 'text',
      size: rawBytes.length,
      encrypted: Boolean(password && password.trim()),
      checksum: crc32(rawBytes),
      timestamp: Date.now(),
    };
  }

  // 2. Encrypt if password provided
  let payloadBytesToEmbed = rawBytes;
  if (password && password.trim()) {
    const encResult = await encryptPayload(rawBytes, password.trim());
    payloadBytesToEmbed = encResult.cipherData;
    metadata.saltHex = encResult.saltHex;
    metadata.ivHex = encResult.ivHex;
  }

  // 3. Serialize Header Envelope: [STEGO_MAGIC] + [4 bytes JSON length] + [JSON Metadata] + [Payload]
  const metaJson = JSON.stringify(metadata);
  const metaJsonBytes = new TextEncoder().encode(metaJson);

  const totalLength = STEGO_MAGIC.length + 4 + metaJsonBytes.length + payloadBytesToEmbed.length;
  const fullEnvelope = new Uint8Array(totalLength);

  // Magic
  for (let i = 0; i < STEGO_MAGIC.length; i++) {
    fullEnvelope[i] = STEGO_MAGIC.charCodeAt(i);
  }

  // 4 bytes metadata length (Big Endian)
  const metaLen = metaJsonBytes.length;
  fullEnvelope[STEGO_MAGIC.length] = (metaLen >> 24) & 0xff;
  fullEnvelope[STEGO_MAGIC.length + 1] = (metaLen >> 16) & 0xff;
  fullEnvelope[STEGO_MAGIC.length + 2] = (metaLen >> 8) & 0xff;
  fullEnvelope[STEGO_MAGIC.length + 3] = metaLen & 0xff;

  // Metadata JSON
  fullEnvelope.set(metaJsonBytes, STEGO_MAGIC.length + 4);

  // Payload
  fullEnvelope.set(payloadBytesToEmbed, STEGO_MAGIC.length + 4 + metaJsonBytes.length);

  // 4. Setup Canvas
  let canvas: HTMLCanvasElement;
  if (coverImage instanceof HTMLCanvasElement) {
    canvas = coverImage;
  } else if (coverImage instanceof File) {
    canvas = await loadImageToCanvas(coverImage);
  } else {
    // Automatically size canvas to accommodate the payload with plenty of headroom
    const bitsNeeded = fullEnvelope.length * 8;
    const pixelsNeeded = Math.ceil(bitsNeeded / 3);
    const minDim = Math.max(800, Math.ceil(Math.sqrt(pixelsNeeded * 1.5)));
    canvas = generateCoverCanvas(coverTheme, Math.max(960, minDim), Math.max(720, Math.floor(minDim * 0.75)));
  }

  const { usableBytes } = calculateCapacity(canvas.width, canvas.height);
  if (fullEnvelope.length > usableBytes) {
    // If cover is too small, resize or scale up canvas
    const scaleFactor = Math.ceil(Math.sqrt((fullEnvelope.length * 8) / (canvas.width * canvas.height * 3))) + 1;
    const newWidth = canvas.width * scaleFactor;
    const newHeight = canvas.height * scaleFactor;
    const largerCanvas = document.createElement('canvas');
    largerCanvas.width = newWidth;
    largerCanvas.height = newHeight;
    const lCtx = largerCanvas.getContext('2d');
    if (lCtx) {
      lCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
      canvas = largerCanvas;
    }
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot acquire canvas context for steganography');

  // 5. LSB Modulation on R, G, B channels
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let byteIdx = 0;
  let bitIdx = 7; // high to low bit

  for (let i = 0; i < data.length && byteIdx < fullEnvelope.length; i += 4) {
    // Channel R
    if (byteIdx < fullEnvelope.length) {
      const bit = (fullEnvelope[byteIdx] >> bitIdx) & 1;
      data[i] = (data[i] & ~1) | bit;
      bitIdx--;
      if (bitIdx < 0) {
        bitIdx = 7;
        byteIdx++;
      }
    }

    // Channel G
    if (byteIdx < fullEnvelope.length) {
      const bit = (fullEnvelope[byteIdx] >> bitIdx) & 1;
      data[i + 1] = (data[i + 1] & ~1) | bit;
      bitIdx--;
      if (bitIdx < 0) {
        bitIdx = 7;
        byteIdx++;
      }
    }

    // Channel B
    if (byteIdx < fullEnvelope.length) {
      const bit = (fullEnvelope[byteIdx] >> bitIdx) & 1;
      data[i + 2] = (data[i + 2] & ~1) | bit;
      bitIdx--;
      if (bitIdx < 0) {
        bitIdx = 7;
        byteIdx++;
      }
    }
    // Alpha channel data[i + 3] remains intact (255)
  }

  ctx.putImageData(imgData, 0, 0);

  // 6. Output as Lossless PNG
  const blob: Blob = await new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG export failed'))), 'image/png');
  });

  const finalName = outputName || `BeamDrop_Stego_${metadata.type === 'file' ? (metadata.name || 'document') : 'secret'}.png`;
  const stegoFile = new File([blob], finalName, { type: 'image/png' });
  const previewUrl = URL.createObjectURL(blob);

  return {
    stegoFile,
    previewUrl,
    metadata,
    dimensions: { width: canvas.width, height: canvas.height },
  };
}

/**
 * Decodes hidden payload from a steganography PNG carrier image
 */
export async function decodeDataFromImage(
  stegoImage: File | Blob,
  password?: string
): Promise<StegoDecodedResult> {
  const canvas = await loadImageToCanvas(stegoImage);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot acquire canvas context for steganography decoding');

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Stream reader generator for bits
  let bitCursor = 0;
  let currentByte = 0;
  const pixelChannelCount = (data.length / 4) * 3;

  function readNextByte(): number {
    let b = 0;
    for (let k = 7; k >= 0; k--) {
      const channelIdx = bitCursor;
      bitCursor++;
      if (channelIdx >= pixelChannelCount) {
        throw new Error('Unexpected end of image stream');
      }
      const pixelIdx = Math.floor(channelIdx / 3) * 4;
      const colorOffset = channelIdx % 3; // 0=R, 1=G, 2=B
      const bit = data[pixelIdx + colorOffset] & 1;
      b = (b << 1) | bit;
    }
    return b;
  }

  // 1. Read and verify magic prefix
  const magicChars: string[] = [];
  for (let i = 0; i < STEGO_MAGIC.length; i++) {
    magicChars.push(String.fromCharCode(readNextByte()));
  }
  const magic = magicChars.join('');
  if (magic !== STEGO_MAGIC) {
    throw new Error('This image does not contain a valid BeamDrop steganography payload.');
  }

  // 2. Read 4-byte metadata length
  const m0 = readNextByte();
  const m1 = readNextByte();
  const m2 = readNextByte();
  const m3 = readNextByte();
  const metaLen = ((m0 << 24) | (m1 << 16) | (m2 << 8) | m3) >>> 0;

  if (metaLen <= 0 || metaLen > 100000) {
    throw new Error('Invalid steganography header metadata length.');
  }

  // 3. Read JSON metadata
  const metaBytes = new Uint8Array(metaLen);
  for (let i = 0; i < metaLen; i++) {
    metaBytes[i] = readNextByte();
  }
  const metaJsonStr = new TextDecoder().decode(metaBytes);
  const metadata: StegoMetadata = JSON.parse(metaJsonStr);

  // 4. Read payload bytes
  const payloadBytes = new Uint8Array(metadata.size);
  for (let i = 0; i < metadata.size; i++) {
    payloadBytes[i] = readNextByte();
  }

  // 5. Decrypt if encrypted
  let clearBytes = payloadBytes;
  if (metadata.encrypted) {
    if (!password || !password.trim()) {
      throw new Error('This steganographic payload is encrypted with a passcode. Please enter the password.');
    }
    if (!metadata.saltHex || !metadata.ivHex) {
      throw new Error('Missing encryption vectors in carrier image.');
    }
    try {
      clearBytes = await decryptPayload(payloadBytes, password.trim(), metadata.saltHex, metadata.ivHex);
    } catch {
      throw new Error('Incorrect password. Could not decrypt steganographic payload.');
    }
  }

  // 6. Verify Checksum
  const computedCrc = crc32(clearBytes);
  if (computedCrc !== metadata.checksum) {
    console.warn(`[Stego Checksum] Computed ${computedCrc} != Header ${metadata.checksum}`);
  }

  // 7. Format output
  if (metadata.type === 'file') {
    const fileName = metadata.name || 'extracted_payload.bin';
    const file = new File([clearBytes], fileName, { type: metadata.mimeType || 'application/octet-stream' });
    return {
      type: 'file',
      file,
      name: fileName,
      mimeType: metadata.mimeType,
      size: clearBytes.length,
      encrypted: metadata.encrypted,
      timestamp: metadata.timestamp,
    };
  } else {
    const text = new TextDecoder().decode(clearBytes);
    return {
      type: 'text',
      text,
      size: clearBytes.length,
      encrypted: metadata.encrypted,
      timestamp: metadata.timestamp,
    };
  }
}
