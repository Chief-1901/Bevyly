import { Router } from 'express';
import { getDb, executeRaw } from '../db/client.js';
import { getRedis } from '../redis/client.js';
import { sql } from 'drizzle-orm';

const router = Router();

/**
 * Custom metrics collection
 * In production, this would be replaced by OpenTelemetry metrics
 */
interface Metrics {
  uptime: number;
  timestamp: string;
  process: {
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    pid: number;
    version: string;
  };
  database?: {
    poolTotal: number;
    poolIdle: number;
    poolWaiting: number;
  };
  redis?: {
    connected: boolean;
  };
}

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/', async (_req, res) => {
  const metrics: Metrics = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    process: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      version: process.version,
    },
  };

  // Check database
  try {
    await executeRaw('SELECT 1');
    metrics.database = {
      poolTotal: 10, // Would come from pool stats
      poolIdle: 8,
      poolWaiting: 0,
    };
  } catch {
    // Database not available
  }

  // Check Redis
  try {
    const redis = getRedis();
    await redis.ping();
    metrics.redis = { connected: true };
  } catch {
    metrics.redis = { connected: false };
  }

  // Return JSON metrics (in production, would return Prometheus format)
  res.json(metrics);
});

/**
 * GET /metrics/prometheus
 * Prometheus text format metrics
 */
router.get('/prometheus', async (_req, res) => {
  const lines: string[] = [];
  
  // Process metrics
  const memory = process.memoryUsage();
  lines.push(`# HELP process_memory_heap_bytes Node.js heap memory usage`);
  lines.push(`# TYPE process_memory_heap_bytes gauge`);
  lines.push(`process_memory_heap_bytes{type="used"} ${memory.heapUsed}`);
  lines.push(`process_memory_heap_bytes{type="total"} ${memory.heapTotal}`);
  lines.push(``);
  
  lines.push(`# HELP process_uptime_seconds Node.js process uptime`);
  lines.push(`# TYPE process_uptime_seconds gauge`);
  lines.push(`process_uptime_seconds ${process.uptime()}`);
  lines.push(``);

  // Database health
  try {
    const start = Date.now();
    await executeRaw('SELECT 1');
    const latency = Date.now() - start;
    lines.push(`# HELP database_health Database connection health`);
    lines.push(`# TYPE database_health gauge`);
    lines.push(`database_health 1`);
    lines.push(`database_latency_ms ${latency}`);
  } catch {
    lines.push(`database_health 0`);
  }
  lines.push(``);

  // Redis health
  try {
    const redis = getRedis();
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    lines.push(`# HELP redis_health Redis connection health`);
    lines.push(`# TYPE redis_health gauge`);
    lines.push(`redis_health 1`);
    lines.push(`redis_latency_ms ${latency}`);
  } catch {
    lines.push(`redis_health 0`);
  }

  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

export { router as metricsRoutes };

