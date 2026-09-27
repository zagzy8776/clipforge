/* -------------------------------------------------------------------------- */
/* Idempotency — prevent duplicate operations                                 */
/* -------------------------------------------------------------------------- */

const idempotencyStore = new Map<string, { result: unknown; createdAt: string }>();

/** Check if an operation with this key has already been performed. */
export function checkIdempotency(key: string): { exists: boolean; result?: unknown } {
  const entry = idempotencyStore.get(key);
  if (entry) return { exists: true, result: entry.result };
  return { exists: false };
}

/** Store the result of an idempotent operation. */
export function storeIdempotency(key: string, result: unknown, ttlMs = 24 * 60 * 60 * 1000): void {
  idempotencyStore.set(key, { result, createdAt: new Date().toISOString() });
  // Auto-expire after TTL
  setTimeout(() => idempotencyStore.delete(key), ttlMs);
}

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                               */
/* -------------------------------------------------------------------------- */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/** Check rate limit for a key (e.g., API key or IP). */
export function checkRateLimit(key: string, maxRequests = 100, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/* -------------------------------------------------------------------------- */
/* Secure API key hashing                                                      */
/* -------------------------------------------------------------------------- */

import { createHash, randomBytes } from "node:crypto";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKeyWithHash(): { key: string; hash: string } {
  const key = `cf_${randomBytes(24).toString("base64url")}`;
  return { key, hash: hashApiKey(key) };
}
