// src/graphql/pubsub.js
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

let pubsub;

// Notification events constants
export const NOTIFICATION_EVENTS = {
  RECEIVED: 'NOTIFICATION_RECEIVED',
  STATUS_UPDATE: 'NOTIFICATION_STATUS_UPDATE'
};

if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('redis://')) {
  // Use non-secure Redis URL
  const publisher = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
  });
  const subscriber = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
  });

  pubsub = new RedisPubSub({
    publisher,
    subscriber,
  });
  console.log("✅ Redis PubSub initialized with remote Redis");
} else if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('rediss://')) {
  // Use Upstash secure Redis
  const publisher = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    tls: {
      rejectUnauthorized: false,
      requestCert: false,
      agent: false
    },
  });
  const subscriber = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    tls: {
      rejectUnauthorized: false,
      requestCert: false,
      agent: false
    },
  });

  pubsub = new RedisPubSub({
    publisher,
    subscriber,
  });
  console.log("✅ Redis PubSub initialized with Upstash Redis");
} else {
  // No Redis URL provided or disabled
  if (process.env.REDIS_DISABLED === 'true') {
    console.log("⚠️ Redis disabled — PubSub using in-memory fallback");
    pubsub = null;
  } else {
    console.log("⚠️ No REDIS_URL provided, trying local Redis...");
    try {
      const publisher = new Redis({
        host: '127.0.0.1',
        port: 6379,
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        connectTimeout: 5000,
      });
      const subscriber = new Redis({
        host: '127.0.0.1',
        port: 6379,
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        connectTimeout: 5000,
      });

      pubsub = new RedisPubSub({
        publisher,
        subscriber,
      });
      console.log("✅ Redis PubSub initialized with local Redis");
    } catch (error) {
      console.warn("⚠️ Redis not available — PubSub disabled:", error.message);
      pubsub = null;
    }
  }
}

export default pubsub;
