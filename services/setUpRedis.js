import Redis from 'ioredis';

// ✅ Graceful Redis initialization
let redis = null;

// ⚡ HIGH-PERFORMANCE Redis configuration for Upstash
const redisConfig = {
  // ⚡ Upstash-optimized settings
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  keyPrefix: 'instarenty:',
  
  // ⚡ Connection pooling optimized for Upstash
  pool: {
    min: 2,
    max: 10, // Reduced for external service
    acquireTimeoutMillis: 10000,
    createTimeoutMillis: 10000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },

  // ⚡ Upstash-specific optimizations
  enableReadyCheck: true,
  maxRetriesPerRequest: 2, // Lower for faster failure detection
  retryDelayOnFailover: 100,
  enableOfflineQueue: true,
  scripts: {},
  
  // ⚡ Connection timeout for external service
  connectTimeout: 10000,
  commandTimeout: 5000,
  responseTimeout: 5000,
};

// Check for Upstash REDIS_URL
if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('redis://')) {
  redis = new Redis(process.env.REDIS_URL, {
    ...redisConfig,
    // No TLS for non-secure connections
  });

  redis.on('connect', () => console.log('🚀 Redis connected to external instance'));
  redis.on('error', (err) => console.error('❌ Redis connection error:', err.message));
} else if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('rediss://')) {
  // Upstash secure connection
  redis = new Redis(process.env.REDIS_URL, {
    ...redisConfig,
    tls: {
      // Upstash requires proper TLS configuration
      rejectUnauthorized: false, // Required for Upstash
      requestCert: false,
      agent: false
    },
  });

  redis.on('connect', () => console.log('🚀 Redis connected to Upstash with TLS'));
  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    console.warn('⚠️ Redis not available — continuing without it');
    redis = null;
  });
} else {
  // Fallback to local Redis (for development)
  if (process.env.REDIS_DISABLED === 'true') {
    console.log('⚠️ Redis disabled — using in-memory fallback');
  } else {
    console.log('⚠️ No REDIS_URL set, trying local Redis on 127.0.0.1:6379...');
    redis = new Redis({
      ...redisConfig,
      host: '127.0.0.1',
      port: 6379,
    });

    redis.on('connect', () => console.log('🚀 Redis connected locally'));
    redis.on('error', (err) => {
      console.error('❌ Redis error (local):', err.message);
      console.warn('⚠️ Redis not available — continuing without it');
      redis = null;
    });
  }
}

// Export safe Redis getter
export const getRedis = () => redis;

export default redis;