// ⚡ Performance monitoring utility for tracking server optimizations
import { getRedis } from '../services/setUpRedis.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    // Use the safe Redis getter instead of creating a new connection
    this.redis = getRedis();
  }

  // Record response time for an endpoint
  recordResponseTime(endpoint, method, duration, statusCode) {
    const key = `${method}:${endpoint}`;
    const metric = {
      timestamp: Date.now(),
      duration,
      statusCode,
      endpoint,
      method,
    };

    // Store in memory for quick access
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const endpointMetrics = this.metrics.get(key);
    endpointMetrics.push(metric);

    // Keep only last 1000 records per endpoint
    if (endpointMetrics.length > 1000) {
      endpointMetrics.shift();
    }

    // Store in Redis for persistence (only if Redis is available)
    if (this.redis) {
      try {
        this.redis.lpush(`metrics:${key}`, JSON.stringify(metric));
        this.redis.ltrim(`metrics:${key}`, 0, 999); // Keep only last 1000
        this.redis.expire(`metrics:${key}`, 3600); // Expire after 1 hour
      } catch (error) {
        // Silently fail if Redis is not available
        console.warn('Performance monitor Redis error:', error.message);
      }
    }
  }

  // Get average response time for an endpoint
  getAverageResponseTime(endpoint, method, timeRange = 300000) { // 5 minutes default
    const key = `${method}:${endpoint}`;
    const endpointMetrics = this.metrics.get(key) || [];

    const now = Date.now();
    const recentMetrics = endpointMetrics.filter(
      metric => (now - metric.timestamp) <= timeRange
    );

    if (recentMetrics.length === 0) return null;

    const totalDuration = recentMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return Math.round(totalDuration / recentMetrics.length);
  }

  // Get response time percentiles
  getResponseTimePercentiles(endpoint, method, percentiles = [50, 90, 95, 99]) {
    const key = `${method}:${endpoint}`;
    const endpointMetrics = this.metrics.get(key) || [];

    if (endpointMetrics.length === 0) return {};

    const durations = endpointMetrics
      .sort((a, b) => a.duration - b.duration)
      .map(metric => metric.duration);

    const results = {};
    percentiles.forEach(percentile => {
      const index = Math.ceil((percentile / 100) * durations.length) - 1;
      results[`p${percentile}`] = durations[Math.max(0, index)];
    });

    return results;
  }

  // Get error rate for an endpoint
  getErrorRate(endpoint, method, timeRange = 300000) {
    const key = `${method}:${endpoint}`;
    const endpointMetrics = this.metrics.get(key) || [];

    const now = Date.now();
    const recentMetrics = endpointMetrics.filter(
      metric => (now - metric.timestamp) <= timeRange
    );

    if (recentMetrics.length === 0) return 0;

    const errorCount = recentMetrics.filter(metric => metric.statusCode >= 400).length;
    return Math.round((errorCount / recentMetrics.length) * 100);
  }

  // Get cache hit rate
  getCacheHitRate(timeRange = 300000) {
    const now = Date.now();
    const allMetrics = [];

    for (const [key, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(
        metric => (now - metric.timestamp) <= timeRange
      );
      allMetrics.push(...recentMetrics);
    }

    if (allMetrics.length === 0) return 0;

    // Assume requests under 10ms are cache hits (adjust threshold as needed)
    const cacheHits = allMetrics.filter(metric => metric.duration < 10).length;
    return Math.round((cacheHits / allMetrics.length) * 100);
  }

  // Get performance summary
  getPerformanceSummary(timeRange = 300000) {
    const summary = {
      timestamp: new Date().toISOString(),
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      endpoints: {},
    };

    const now = Date.now();
    const allMetrics = [];

    for (const [key, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(
        metric => (now - metric.timestamp) <= timeRange
      );

      if (recentMetrics.length > 0) {
        const totalDuration = recentMetrics.reduce((sum, metric) => sum + metric.duration, 0);
        const errorCount = recentMetrics.filter(metric => metric.statusCode >= 400).length;

        summary.endpoints[key] = {
          requestCount: recentMetrics.length,
          averageResponseTime: Math.round(totalDuration / recentMetrics.length),
          errorRate: Math.round((errorCount / recentMetrics.length) * 100),
          minResponseTime: Math.min(...recentMetrics.map(m => m.duration)),
          maxResponseTime: Math.max(...recentMetrics.map(m => m.duration)),
        };

        allMetrics.push(...recentMetrics);
      }
    }

    if (allMetrics.length > 0) {
      const totalDuration = allMetrics.reduce((sum, metric) => sum + metric.duration, 0);
      const errorCount = allMetrics.filter(metric => metric.statusCode >= 400).length;
      const cacheHits = allMetrics.filter(metric => metric.duration < 10).length;

      summary.totalRequests = allMetrics.length;
      summary.averageResponseTime = Math.round(totalDuration / allMetrics.length);
      summary.errorRate = Math.round((errorCount / allMetrics.length) * 100);
      summary.cacheHitRate = Math.round((cacheHits / allMetrics.length) * 100);
    }

    return summary;
  }

  // Middleware function to automatically record metrics
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.recordResponseTime(req.path, req.method, duration, res.statusCode);
      });

      next();
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default PerformanceMonitor;