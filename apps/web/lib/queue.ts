import Redis from "ioredis";

let redis: Redis | null = null;

function parseRedisUrl(url: string): Record<string, unknown> {
  try {
    const parsed = new URL(url);
    const config: Record<string, unknown> = {
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379", 10),
      maxRetriesPerRequest: 1,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
      connectTimeout: 10000,
      enableOfflineQueue: false,
      keepAlive: 30000,
    };
    if (parsed.username) config.username = decodeURIComponent(parsed.username);
    if (parsed.password) config.password = decodeURIComponent(parsed.password);
    if (parsed.pathname && parsed.pathname.length > 1) {
      config.db = parseInt(parsed.pathname.slice(1), 10);
    }
    if (parsed.protocol === "rediss:" || url.includes("ssl=true")) {
      config.tls = { rejectUnauthorized: false };
    }
    return config;
  } catch {
    // Fallback: try ioredis native parsing
    return { lazyConnect: true, connectTimeout: 10000, maxRetriesPerRequest: 1 };
  }
}

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL not configured");
    const config = parseRedisUrl(url);
    redis = new Redis(config as any);
  }
  return redis;
}

/**
 * Enqueue a job using the same sorted-set + hash pattern as RedisQueue.
 */
export async function enqueueJob(opts: {
  jobId: string;
  projectId: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  const r = getRedis();
  if (r.status !== "ready") {
    await r.connect();
  }

  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const msg = {
    id,
    jobId: opts.jobId,
    projectId: opts.projectId,
    payload: { type: opts.type, ...opts.payload },
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: 2,
    nextAttemptAt: new Date().toISOString(),
  };

  const queueKey = "clipforge:queue:pending";
  const dataKey = "clipforge:queue:data";

  await r.hset(dataKey, id, JSON.stringify(msg));
  await r.zadd(queueKey, Date.now(), id);
  return id;
}

/**
 * Test Redis connection — returns status + error for diagnostics.
 */
export async function testRedis(): Promise<{ connected: boolean; error?: string }> {
  try {
    const r = getRedis();
    if (r.status !== "ready") await r.connect();
    const pong = await r.ping();
    return { connected: pong === "PONG" };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) };
  }
}

