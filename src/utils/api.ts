/**
 * Safe fetch utility with guaranteed non-crashing JSON parsing
 */
export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    const text = await res.text();
    let data: T | null = null;

    if (text && text.trim().length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        // Response is not valid JSON (e.g. HTML error page "The page cannot be found...")
        const cleanPreview = text.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ').slice(0, 100);
        return {
          ok: false,
          status: res.status,
          data: null,
          error: cleanPreview || `Server responded with non-JSON content (${res.status})`,
        };
      }
    }

    if (!res.ok) {
      const errorMsg =
        (data as any)?.error ||
        (data as any)?.message ||
        `Server returned error status ${res.status}`;
      return {
        ok: false,
        status: res.status,
        data,
        error: errorMsg,
      };
    }

    return {
      ok: true,
      status: res.status,
      data,
      error: null,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Unable to connect to service',
    };
  }
}
