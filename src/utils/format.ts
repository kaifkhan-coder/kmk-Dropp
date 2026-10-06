/**
 * Format bytes to readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format transfer speed in B/s, KB/s, or MB/s
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return '0 KB/s';
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
  if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
}

/**
 * Format seconds to readable mm:ss or hh:mm:ss
 */
export function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const remSecs = Math.ceil(seconds % 60);
  if (mins < 60) {
    return `${mins}m ${remSecs}s`;
  }
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

/**
 * Detect file category
 */
export type FileCategory = 'image' | 'pdf' | 'document' | 'archive' | 'audio' | 'video' | 'code' | 'other';

export function getFileCategory(fileName: string, mimeType = ''): FileCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext) || mimeType.includes('zip') || mimeType.includes('tar')) {
    return 'archive';
  }
  if (['doc', 'docx', 'rtf', 'odt', 'txt', 'pages'].includes(ext) || mimeType.includes('word') || mimeType.includes('document')) {
    return 'document';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext) || mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext) || mimeType.startsWith('video/')) {
    return 'video';
  }
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'sh', 'sql', 'md'].includes(ext)) {
    return 'code';
  }
  return 'other';
}

import { safeLocalStorage } from './storage';

/**
 * Persistent custom device name in localStorage
 */
export function getSavedDeviceName(): string | null {
  try {
    return safeLocalStorage.getItem('beamdrop_device_name') || null;
  } catch {
    return null;
  }
}

export function setSavedDeviceName(name: string): void {
  try {
    safeLocalStorage.setItem('beamdrop_device_name', name.trim());
  } catch {
    // ignore
  }
}

/**
 * Detect client device name & type with specific Android / iOS model recognition (Redmi, Vivo, Samsung, iPhone, etc.)
 */
export function detectDevice(): { name: string; type: 'mobile' | 'desktop' | 'tablet'; isIOS: boolean } {
  // If user previously set or saved custom device name, use it!
  const savedName = getSavedDeviceName();

  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = isIOS || /mobile|android.*mobile|windows phone/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (isTablet) type = 'tablet';
  else if (isMobile) type = 'mobile';

  if (savedName) {
    return {
      name: savedName,
      type,
      isIOS,
    };
  }

  // Detect specific brands & models
  let brand = '';
  if (/redmi/i.test(ua)) brand = 'Redmi Note';
  else if (/poco/i.test(ua)) brand = 'POCO Phone';
  else if (/xiaomi|mi \d/i.test(ua)) brand = 'Xiaomi Phone';
  else if (/vivo|iqoo|v2\d{3}|v1\d{3}/i.test(ua)) brand = 'Vivo Phone';
  else if (/oppo|cph\d{4}/i.test(ua)) brand = 'Oppo Phone';
  else if (/realme|rmx\d{4}/i.test(ua)) brand = 'Realme Phone';
  else if (/oneplus|gm19|in20|kb20/i.test(ua)) brand = 'OnePlus';
  else if (/samsung|sm-[a-z0-9]+/i.test(ua)) brand = 'Samsung Galaxy';
  else if (/iphone/i.test(ua)) brand = 'Apple iPhone';
  else if (/ipad/i.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) brand = 'Apple iPad';
  else if (/macintosh|mac os x/i.test(ua)) brand = 'MacBook';
  else if (/windows/i.test(ua)) brand = 'Windows PC';
  else if (/cros/i.test(ua)) brand = 'Chromebook';
  else if (/linux/i.test(ua)) brand = 'Linux PC';
  else brand = type === 'mobile' ? 'Mobile Phone' : type === 'tablet' ? 'Tablet' : 'PC';

  // Save detected name to localStorage so it persists and is consistent across views
  setSavedDeviceName(brand);

  return {
    name: brand,
    type,
    isIOS,
  };
}
