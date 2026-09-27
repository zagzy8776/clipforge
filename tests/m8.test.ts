import { describe, it, expect } from "vitest";
import { LocalArtifactStorage } from "../packages/storage/src/artifact-storage";
import { MemoryQueue } from "../packages/storage/src/queue";
import { checkIdempotency, storeIdempotency, checkRateLimit, hashApiKey } from "../packages/api/src/security";

describe("LocalArtifactStorage", () => {
  const store = new LocalArtifactStorage("e:/video/.test-artifacts");

  it("put and get", async () => {
    const key = "test/file.txt";
    await store.put(key, "hello world");
    const data = await store.get(key);
    expect(data.toString()).toBe("hello world");
  });

  it("exists", async () => {
    expect(await store.exists("test/file.txt")).toBe(true);
    expect(await store.exists("test/nonexistent.txt")).toBe(false);
  });

  it("head returns metadata", async () => {
    const info = await store.head("test/file.txt");
    expect(info.size).toBe(11);
    expect(info.key).toBe("test/file.txt");
  });

  it("delete removes file", async () => {
    await store.put("test/to-delete.txt", "delete me");
    expect(await store.exists("test/to-delete.txt")).toBe(true);
    await store.delete("test/to-delete.txt");
    expect(await store.exists("test/to-delete.txt")).toBe(false);
  });

  it("list returns files with prefix", async () => {
    await store.put("list/a.txt", "a");
    await store.put("list/b.txt", "b");
    await store.put("other/c.txt", "c");
    const files = await store.list("list/");
    expect(files.length).toBe(2);
  });

  it("getSignedUrl returns file URL", async () => {
    await store.put("url/test.txt", "content");
    const url = await store.getSignedUrl("url/test.txt");
    expect(url.startsWith("file://")).toBe(true);
  });
});

describe("MemoryQueue", () => {
  it("enqueue and dequeue", async () => {
    const q = new MemoryQueue();
    await q.enqueue({ jobId: "j1", projectId: "p1", payload: { action: "render" }, maxAttempts: 3 });
    expect(await q.depth()).toBe(1);
    const msg = await q.dequeue();
    expect(msg).not.toBeNull();
    expect(msg!.jobId).toBe("j1");
    expect(msg!.attempts).toBe(1);
  });

  it("ack removes message", async () => {
    const q = new MemoryQueue();
    const id = await q.enqueue({ jobId: "j2", projectId: "p1", payload: {}, maxAttempts: 3 });
    const msg = await q.dequeue();
    await q.ack(msg!.id);
    expect(await q.depth()).toBe(0);
  });

  it("nack retries with backoff", async () => {
    const q = new MemoryQueue();
    await q.enqueue({ jobId: "j3", projectId: "p1", payload: {}, maxAttempts: 3 });
    const msg1 = await q.dequeue();
    expect(msg1).not.toBeNull();
    await q.nack(msg1!.id, "error");
    // Wait for backoff (1 second for first retry)
    await new Promise((r) => setTimeout(r, 1100));
    expect(await q.depth()).toBe(1);
    const msg2 = await q.dequeue();
    expect(msg2).not.toBeNull();
    expect(msg2!.attempts).toBe(2);
  });

  it("nack moves to dead letter after max attempts", async () => {
    const q = new MemoryQueue();
    await q.enqueue({ jobId: "j4", projectId: "p1", payload: {}, maxAttempts: 2 });
    const msg1 = await q.dequeue();
    await q.nack(msg1!.id, "fail1");
    // Wait for backoff (1 second) to expire
    await new Promise((r) => setTimeout(r, 1100));
    const msg2 = await q.dequeue();
    expect(msg2).not.toBeNull();
    await q.nack(msg2!.id, "fail2");
    expect(await q.depth()).toBe(0);
    expect((await q.deadLetters()).length).toBe(1);
  });

  it("cancel removes pending messages", async () => {
    const q = new MemoryQueue();
    await q.enqueue({ jobId: "j5", projectId: "p1", payload: {}, maxAttempts: 3 });
    const msg = await q.dequeue();
    await q.cancel(msg!.id);
    expect(await q.depth()).toBe(0);
  });
});

describe("Security", () => {
  it("idempotency prevents duplicate operations", () => {
    const key = `op-${Date.now()}`;
    expect(checkIdempotency(key).exists).toBe(false);
    storeIdempotency(key, { result: "done" });
    expect(checkIdempotency(key).exists).toBe(true);
    expect(checkIdempotency(key).result).toEqual({ result: "done" });
  });

  it("rate limiter allows within limit", () => {
    const key = `rl-${Date.now()}`;
    const r1 = checkRateLimit(key, 5, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(4);
    for (let i = 0; i < 4; i++) checkRateLimit(key, 5, 60_000);
    const r5 = checkRateLimit(key, 5, 60_000);
    expect(r5.allowed).toBe(false);
  });

  it("hashApiKey is deterministic", () => {
    const h1 = hashApiKey("cf_test123");
    const h2 = hashApiKey("cf_test123");
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64); // SHA-256 hex
  });
});
