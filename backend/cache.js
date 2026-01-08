/**
 * In-memory cache for scan results
 * Key: SHA-256 hash of image + restrictions
 * TTL: 24 hours
 */

const crypto = require('crypto');

class ScanCache {
  constructor(ttlHours = 24) {
    this.cache = new Map();
    this.ttl = ttlHours * 60 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Generate cache key from image buffer and restrictions
   * @param {Buffer} imageBuffer - Image file buffer
   * @param {Array} restrictions - Array of restriction strings
   * @returns {string} SHA-256 hash
   */
  generateKey(imageBuffer, restrictions) {
    const restrictionsStr = JSON.stringify(restrictions.sort());
    const combined = Buffer.concat([
      imageBuffer,
      Buffer.from(restrictionsStr, 'utf8')
    ]);
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get cached result
   * @param {string} key - Cache key
   * @returns {Object|null} Cached result or null if miss/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store result in cache
   * @param {string} key - Cache key
   * @param {Object} data - Result data to cache
   */
  set(key, data) {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, {
      data,
      expiresAt
    });
  }

  /**
   * Clear expired entries (cleanup)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
module.exports = new ScanCache(24);
