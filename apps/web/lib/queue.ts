import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL not configured");
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) { return Math.min(times * 200, 3000); },
      lazyConnect: true,
      connectTimeout: 5000,
      tls: url.startsWith("rediss://") ? {} : undefined,
    });
  }
  return redis;
}

/**
 * Enqueue a job using the same sorted-set + hash pattern as RedisQueue.
 * Worker expects: hset(clipforge:queue:data, id, msg) + zadd(clipforge:queue:pending, now, id)
 */
export async function enqueueJob(opts: {
  jobId: string;
  projectId: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  const r = getRedis();
  if (r.status !== "ready") await r.connect();

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
