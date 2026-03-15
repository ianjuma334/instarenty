#!/usr/bin/env node

/**
 * Cache Clear Script: Clear Post Cache
 * 
 * This script clears all post-related cache entries from Redis
 * to force fresh data fetch from database.
 * 
 * Run with: node scripts/clearPostCache.js
 */

import Post from '../Data/PostDetails.js';
import { createClient } from 'redis';

// Import Redis config (adjust path as needed)
import { createRedisClient } from '../services/setUpRedis.js';

const clearPostCache = async () => {
  try {
    console.log('🚀 Starting post cache clearing...');
    
    // Create Redis client
    const redis = createRedisClient();
    await redis.connect();
    
    // Get all post IDs
    const posts = await Post.find({}, '_id');
    console.log(`📊 Found ${posts.length} posts to clear cache for`);
    
    let cleared = 0;
    
    for (const post of posts) {
      const cacheKey = `post:${post._id}`;
      await redis.del(cacheKey);
      cleared++;
      
      if (cleared % 10 === 0) {
        console.log(`🗑️ Cleared ${cleared}/${posts.length} cache entries...`);
      }
    }
    
    // Also clear any cached post list queries
    console.log('🗑️ Clearing post list cache entries...');
    const keys = await redis.keys('posts:*');
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`🗑️ Cleared ${keys.length} post list cache entries`);
    }

    console.log(`\n✅ Cache clearing completed!`);
    console.log(`📊 Total cache entries cleared: ${cleared + keys.length}`);

    await redis.quit();
    process.exit(0);

  } catch (error) {
    console.error('❌ Cache clearing failed:', error);
    process.exit(1);
  }
};

// Run the cache clearing
clearPostCache();