import type { Queue, QueueMessage } from "./queue.js";
import { createRequire } from "node:module";

/**
 * Redis-backed queue with atomic dequeue, retry backoff, and dead-letter.
 * Uses a sorted set (score = nextAttemptAt) + hash for payloads.
 */
export class RedisQueue<T = unknown> implements Queue<T> {
  private redis: any;
  private prefix: string;
  private deadKey: string;
  private queueKey: string;
  private dataKey: string;

  constructor(redisUrl: string, namespace = "clipforge:queue") {
    const req = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = req("ioredis");
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => Math.min(times * 200, 5_000),
    });
    this.prefix = namespace;
    this.queueKey = `${namespace}:pending`;
    this.dataKey = `${namespace}:data`;
    this.deadKey = `${namespace}:dead`;
  }

  async enqueue(msg: Omit<QueueMessage<T>, "id" | "enqueuedAt" | "attempts" | "nextAttemptAt">): Promise<string> {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const full: QueueMessage<T> = {
      ...msg, id,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: msg.maxAttempts ?? 3,
      nextAttemptAt: new Date().toISOString(),
    };
    await this.redis.hset(this.dataKey, id, JSON.stringify(full));
    await this.redis.zadd(this.queueKey, Date.now(), id);
    return id;
  }

  async dequeue(): Promise<QueueMessage<T> | null> {
    // Atomic: pop lowest-score item that is due
    const now = Date.now();
    const ids: string[] = await this.redis.zrangebyscore(this.queueKey, "-inf", now, "LIMIT", 0, 1);
    if (!ids || ids.length === 0) return null;
    const id = ids[0]!;

    // Claim it atomically
    const removed = await this.redis.zrem(this.queueKey, id);
    if (removed === 0) return null; // another worker got it

    const raw = await this.redis.hget(this.dataKey, id);
    if (!raw) return null;

    const msg: QueueMessage<T> = JSON.parse(raw);
    msg.attempts++;
    await this.redis.hset(this.dataKey, id, JSON.stringify(msg));
    return msg;
  }

  async ack(messageId: string): Promise<void> {
    await this.redis.hdel(this.dataKey, messageId);
  }

  async nack(messageId: string, error?: string): Promise<void> {
    const raw = await this.redis.hget(this.dataKey, messageId);
    if (!raw) return;
    const msg: QueueMessage<T> = JSON.parse(raw);

    if (msg.attempts >= msg.maxAttempts) {
      await this.redis.hset(this.deadKey, messageId, JSON.stringify({ ...msg, error }));
      await this.redis.hdel(this.dataKey, messageId);
      return;
    }

    // Exponential backoff: 2^attempts seconds
    const backoffMs = Math.min(30_000, Math.pow(2, msg.attempts) * 1000);
    msg.nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();
    await this.redis.hset(this.dataKey, messageId, JSON.stringify(msg));
    await this.redis.zadd(this.queueKey, Date.now() + backoffMs, messageId);
  }

  async cancel(messageId: string): Promise<void> {
    await this.redis.zrem(this.queueKey, messageId);
    await this.redis.hdel(this.dataKey, messageId);
  }

  async depth(): Promise<number> {
    return this.redis.zcard(this.queueKey);
  }

  async deadLetters(): Promise<QueueMessage<T>[]> {
    const all = await this.redis.hgetall(this.deadKey);
    return Object.values(all).map((v: any) => JSON.parse(v as string));
  }

  /** Ping for health checks. */
  async ping(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
