import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL not configured");

    const needsTls = url.startsWith("rediss://");
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
      connectTimeout: 10000,
      enableOfflineQueue: false,
      tls: needsTls ? { rejectUnauthorized: false } : undefined,
      // Keep alive to prevent Vercel's idle timeout
      keepAlive: 30000,
    });
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

