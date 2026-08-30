/**
 * Client-Side In-Memory Cache with Stale-While-Revalidate (SWR) support.
 * Enables 0ms instantaneous page transitions and background revalidation.
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Get cached data if available
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data as T;
  }

  /**
   * Check if cache entry is still fresh
   */
  isFresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Save data into cache
   */
  set<T = any>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalidate specific keys or keys matching a prefix/regex
   */
  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    if (typeof pattern === "string") {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else if (pattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Fetch with Stale-While-Revalidate (SWR) pattern
   * 1. Returns cached copy immediately if present via onCached callback
   * 2. Fetches fresh data over the network in background
   * 3. Updates cache and calls onFresh with latest data
   */
  async swrFetch<T = any>(
    url: string,
    options?: RequestInit,
    onCached?: (cachedData: T) => void,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // 1. If cached, provide cached data immediately for 0ms render
    const cached = this.get<T>(url);
    if (cached && onCached) {
      onCached(cached);
    }

    // 2. Fetch fresh data from API
    const res = await fetch(url, {
      ...options,
      cache: "no-store",
    });

    if (!res.ok) {
      if (cached) return cached;
      throw new Error(`API request failed with status ${res.status}`);
    }

    const freshData = await res.json();
    this.set(url, freshData, ttl);
    return freshData;
  }
}

export const apiCache = new ApiCache();
