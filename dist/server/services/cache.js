"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
/**
 * Simple in-memory cache service for storing frequently accessed data
 * Provides TTL-based expiration and thread-safe operations
 */
class CacheService {
    /** Internal map to store cache entries */
    cache = new Map();
    /**
     * Get a value from the cache
     * @param key The cache key to retrieve
     * @returns The cached value or undefined if not found or expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check if entry has expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /**
     * Set a value in the cache with a time-to-live
     * @param key The cache key to store the value under
     * @param value The value to cache
     * @param ttl Time to live in milliseconds (default: 5 minutes)
     */
    set(key, value, ttl = 5 * 60 * 1000) {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { value, expiry });
    }
    /**
     * Delete a value from the cache
     * @param key The cache key to remove
     */
    delete(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all entries from the cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get the number of entries in the cache
     * @returns The number of entries in the cache
     */
    size() {
        return this.cache.size;
    }
    /**
     * Clean up expired entries from the cache
     * This method iterates through all entries and removes those that have expired
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
            }
        }
    }
}
exports.CacheService = CacheService;
/**
 * Global instance of the cache service
 * Use this instance throughout the application for caching
 */
exports.cacheService = new CacheService();
//# sourceMappingURL=cache.js.map