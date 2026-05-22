/**
 * In-memory cache for API responses to avoid hitting rate limits.
 * Uses a TTL (Time To Live) approach.
 */

class Cache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Set a value in the cache with a TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMinutes - Time to live in minutes
   */
  set(key, value, ttlMinutes = 5) {
    const expiresAt = Date.now() + (ttlMinutes * 60 * 1000);
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get a value from the cache if it hasn't expired
   * @param {string} key - Cache key
   * @returns {any|null} The cached value or null if expired/not found
   */
  get(key) {
    const item = this.store.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.store.clear();
  }
}

// Export a singleton instance
export const apiCache = new Cache();
