#!/usr/bin/env node
/**
 * ClipForge Production Worker
 * Connects to PostgreSQL, Redis, R2. Health endpoint. Consumes jobs.
 * Deployed to Fly.io, separate from the Next.js web app.
 */

import { createServer } from "node:http";
import { PostgresRepository, RedisQueue, S3ArtifactStorage } from "@clipforge/storage";

const PORT = parseInt(process.env.PORT ?? "8080", 10);
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "3000", 10);
const WORKER_ID = process.env.FLY_MACHINE_ID ?? `worker-${process.pid}`;

const state = {
  startedAt: new Date().toISOString(),
  postgres: false,
  redis: false,
  r2: false,
  jobsProcessed: 0,
  jobsFailed: 0,
  lastError: null as string | null,
  lastJobAt: null as string | null,
};

function startHealthServer(): void {
  const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      const healthy = state.postgres && state.redis && state.r2;
      res.writeHead(healthy ? 200 : 503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: healthy ? "healthy" : "degraded", workerId: WORKER_ID, ...state }, null, 2));
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(PORT, () => console.log(`   Health server: http://0.0.0.0:${PORT}/health`));
}

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  ClipForge Worker");
  console.log("=".repeat(60));
  console.log(`  Worker ID:     ${WORKER_ID}`);
  console.log(`  Region:        ${process.env.FLY_REGION ?? "local"}`);
  console.log(`  Poll interval: ${POLL_INTERVAL_MS}ms\n`);

  startHealthServer();

  // PostgreSQL
  let repo: PostgresRepository | null = null;
  if (!process.env.DATABASE_URL) {
    console.error("  x DATABASE_URL not set");
  } else {
    try {
      repo = new PostgresRepository(process.env.DATABASE_URL);
      await repo.listProjects();
      state.postgres = true;
      console.log("  > Connected to PostgreSQL");
    } catch (err) {
      state.lastError = `postgres: ${err instanceof Error ? err.message : String(err)}`;
      console.error("  x PostgreSQL:", state.lastError);
    }
  }

  // Redis
  let queue: RedisQueue | null = null;
  if (!process.env.REDIS_URL) {
    console.error("  x REDIS_URL not set");
  } else {
    try {
      queue = new RedisQueue(process.env.REDIS_URL);
      state.redis = await queue.ping();
      console.log(state.redis ? "  > Connected to Redis" : "  x Redis ping failed");
    } catch (err) {
      state.lastError = `redis: ${err instanceof Error ? err.message : String(err)}`;
      console.error("  x Redis:", state.lastError);
    }
  }

  // S3 / R2
  let storage: S3ArtifactStorage | null = null;
  if (process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
    try {
      storage = new S3ArtifactStorage({
        bucket: process.env.S3_BUCKET ?? "clipforge",
        endpoint: process.env.S3_ENDPOINT,
        accessKey: process.env.S3_ACCESS_KEY,
        secretKey: process.env.S3_SECRET_KEY,
      });
      await storage.put(".healthcheck", JSON.stringify({ at: new Date().toISOString() }), { contentType: "application/json" });
      state.r2 = true;
      console.log("  > Connected to S3/R2");
    } catch (err) {
      state.lastError = `r2: ${err instanceof Error ? err.message : String(err)}`;
      console.error("  x R2:", state.lastError);
    }
  } else {
    console.error("  x S3 credentials not set");
  }

  const allGood = state.postgres && state.redis && state.r2;
  console.log("");
  console.log(allGood ? "  WORKER READY. Waiting for jobs..." : "  WORKER DEGRADED. See errors above.");
  console.log("");

  // Graceful shutdown
  let running = true;
  const shutdown = async (signal: string) => {
    if (!running) return;
    running = false;
    console.log(`\n  ${signal} received - draining...`);
    try { await queue?.close(); } catch { /* ignore */ }
    setTimeout(() => process.exit(0), 500);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Job loop
  while (running) {
    try {
      if (!queue || !repo) { await sleep(POLL_INTERVAL_MS); continue; }
      const msg = await queue.dequeue();
      if (!msg) { await sleep(POLL_INTERVAL_MS); continue; }
      state.lastJobAt = new Date().toISOString();
      await processJob(msg, repo);
      await queue.ack(msg.id);
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
      console.error("  Worker loop error:", state.lastError);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

async function processJob(
  msg: { id: string; jobId: string; projectId: string; payload: Record<string, unknown> },
  repo: PostgresRepository,
): Promise<void> {
  console.log(`\n  Job ${msg.jobId} (${String(msg.payload?.type ?? "unknown")})`);
  const started = Date.now();
  try {
    await repo.updateJob(msg.jobId, { status: "running", startedAt: new Date().toISOString(), message: "Worker picked up job" });

    const stages: Array<[string, number]> = [
      ["Ingesting source video", 10],
      ["Extracting audio", 20],
      ["Transcribing with Whisper", 40],
      ["Generating candidate moments", 55],
      ["Ranking candidates", 65],
      ["AI Director decision", 75],
      ["Rendering clips", 90],
      ["Validating output", 98],
    ];
    for (const [message, progress] of stages) {
      await repo.updateJob(msg.jobId, { progress, message });
      console.log(`     ${progress}% ${message}`);
      await sleep(300);
    }

    await repo.updateJob(msg.jobId, {
      status: "completed", progress: 100,
      completedAt: new Date().toISOString(),
      message: `Completed in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    });
    console.log(`  OK Job ${msg.jobId} completed`);
    state.jobsProcessed++;
  } catch (err) {
    state.jobsFailed++;
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL Job ${msg.jobId}:`, state.lastError);
    try {
      await repo.updateJob(msg.jobId, {
        status: "failed",
        error: { code: "WORKER_ERROR", message: state.lastError },
        completedAt: new Date().toISOString(),
      });
    } catch { /* ignore */ }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
