/**
 * Safe LocalStorage & SessionStorage wrapper
 * Prevents SecurityError / DOMException crashes in Private Browsing, iOS WebViews, and strict cross-origin iframes
 */

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Access blocked by browser policy (e.g. cross-origin iframe / private browsing)
    }
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Access blocked, save to in-memory fallback
    }
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Access blocked
    }
    this.store.delete(key);
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Access blocked
    }
    this.store.clear();
  }
}

class MemorySessionStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const val = window.sessionStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {}
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch {}
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {}
    this.store.delete(key);
  }
}

export const safeLocalStorage = new MemoryStorage();
export const safeSessionStorage = new MemorySessionStorage();
