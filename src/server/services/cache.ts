/**
 * Represents an entry in the cache with its value and expiration time
 * @template T - The type of the cached value
 */
export interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Unix timestamp in milliseconds when the entry expires */
  expiry: number;
}

/**
 * Simple in-memory cache service for storing frequently accessed data
 * Provides TTL-based expiration and thread-safe operations
 */
export class CacheService {
  /** Internal map to store cache entries */
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * Get a value from the cache
   * @param key The cache key to retrieve
   * @returns The cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a value in the cache with a time-to-live
   * @param key The cache key to store the value under
   * @param value The value to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete a value from the cache
   * @param key The cache key to remove
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache
   * @returns The number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries from the cache
   * This method iterates through all entries and removes those that have expired
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Global instance of the cache service
 * Use this instance throughout the application for caching
 */
export const cacheService = new CacheService();
