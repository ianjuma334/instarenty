import { getRedis } from '../services/setUpRedis.js';
import { logInfo, logWarn } from './logger.js';

/**
 * Cache utility functions for Redis operations
 */

// Default cache TTL (Time To Live) in seconds
const DEFAULT_TTL = 3600; // 1 hour
const SHORT_TTL = 300; // 5 minutes
const LONG_TTL = 86400; // 24 hours

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached data or null
 */
export const getCache = async (key) => {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    if (data) {
      logInfo(`Cache hit for key: ${key}`);
      return JSON.parse(data);
    }
    logInfo(`Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    logWarn(`Cache get error for key ${key}:`, error);
    return null;
  }
};

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 */
export const setCache = async (key, data, ttl = DEFAULT_TTL) => {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    logInfo(`Cache set for key: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logWarn(`Cache set error for key ${key}:`, error);
  }
};

/**
 * Delete cache entry
 * @param {string} key - Cache key
 */
export const deleteCache = async (key) => {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(key);
    logInfo(`Cache deleted for key: ${key}`);
  } catch (error) {
    logWarn(`Cache delete error for key ${key}:`, error);
  }
};

/**
 * Clear all cache entries matching a pattern
 * @param {string} pattern - Pattern to match (e.g., "users:*")
 */
export const clearCachePattern = async (pattern) => {
  const redis = getRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
      logInfo(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
    }
  } catch (error) {
    logWarn(`Cache clear pattern error for ${pattern}:`, error);
  }
};

/**
 * Cache wrapper for database queries
 * @param {string} key - Cache key
 * @param {Function} queryFn - Function that returns the data to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Cached or fresh data
 */
export const cacheQuery = async (key, queryFn, ttl = DEFAULT_TTL) => {
  // Try to get from cache first
  const cached = await getCache(key);
  if (cached) {
    return cached;
  }

  // Execute query and cache result
  const data = await queryFn();
  await setCache(key, data, ttl);
  return data;
};

/**
 * Invalidate related caches when data changes
 * @param {string} entity - Entity type (e.g., 'user', 'post')
 * @param {string} id - Entity ID
 */
export const invalidateEntityCache = async (entity, id) => {
  const patterns = [
    `${entity}:${id}`,
    `${entity}:*`,
    `${entity}s:all`,
    `${entity}s:list:*`
  ];

  for (const pattern of patterns) {
    await clearCachePattern(pattern);
  }
};

// Cache key generators
export const cacheKeys = {
  user: (id) => `user:${id}`,
  users: () => 'users:all',
  userPosts: (userId) => `user:${userId}:posts`,
  post: (id) => `post:${id}`,
  posts: () => 'posts:all',
  postsByLocation: (county, subcounty) => `posts:location:${county}:${subcounty}`,
  postsByType: (type) => `posts:type:${type}`,
  featuredPosts: () => 'posts:featured',
  popularPosts: () => 'posts:popular',
  recentPosts: () => 'posts:recent',
  fees: () => 'fees:data'
};

export { DEFAULT_TTL, SHORT_TTL, LONG_TTL };