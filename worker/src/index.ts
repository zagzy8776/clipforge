#!/usr/bin/env node
/**
 * ClipForge Production Worker
 * Connects to PostgreSQL, Redis, R2. Health endpoint. Consumes jobs.
 * Deployed to Fly.io, separate from the Next.js web app.
 *
 * Phase 2: actually invokes the real ClipForge engine (runEngine) to
 * produce clips from a source URL or local path, then uploads results.
 */

import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PostgresRepository, RedisQueue, S3ArtifactStorage, LocalArtifactStorage, type ProjectRepository } from "@clipforge/storage";
import { runEngine, type EngineOutput } from "@clipforge/core";
import { downloadFromUrl } from "@clipforge/ingest";
import type { EngineConfig } from "@clipforge/types";

const PORT = parseInt(process.env.PORT ?? "8080", 10);
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "3000", 10);
const WORKER_ID = process.env.FLY_MACHINE_ID ?? `worker-${process.pid}`;
const WORKER_WORKDIR = process.env.WORKER_WORKDIR ?? join(process.cwd(), "worker-work");
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "1", 10);

mkdirSync(WORKER_WORKDIR, { recursive: true });

const state = {
  startedAt: new Date().toISOString(),
  postgres: false,
  redis: false,
  r2: false,
  python3: false,
  opencv: false,
  jobsProcessed: 0,
  jobsFailed: 0,
  lastError: null as string | null,
  lastJobAt: null as string | null,
};

type StorageBackend = S3ArtifactStorage | LocalArtifactStorage;

/** Check that python3 + opencv-python-headless are importable (face detection sidecar). */
function checkPythonDeps(): { python3: boolean; opencv: boolean } {
  let python3 = false;
  let opencv = false;
  const py = process.env.WORKER_PYTHON ?? "python3";
  try {
    execFileSync(py, ["--version"], { stdio: "ignore", timeout: 3_000 });
    python3 = true;
  } catch { /* try python on systems without python3 */
    const fallback = "python";
    try {
      execFileSync(fallback, ["--version"], { stdio: "ignore", timeout: 3_000 });
      python3 = true;
    } catch { /* not available */ }
  }
  if (python3) {
    const pyBin = existsSync("/usr/bin/python3") ? "/usr/bin/python3" : py;
    try {
      execFileSync(pyBin, ["-c", "import cv2; print(cv2.__version__)"], {
        stdio: "pipe", timeout: 10_000,
      });
      opencv = true;
    } catch { /* opencv not importable */ }
  }
  return { python3, opencv };
}

function startHealthServer(): void {
  const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      const healthy = state.postgres && state.redis && state.r2 && state.python3 && state.opencv;
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

  // Python + OpenCV presence (face detection sidecar)
  const py = checkPythonDeps();
  state.python3 = py.python3;
  state.opencv = py.opencv;
  if (py.python3 && py.opencv) {
    console.log("  > Python3 + OpenCV available for face detection");
  } else {
    state.lastError = `python: ${py.python3 ? "ok" : "missing"}, opencv: ${py.opencv ? "ok" : "missing"}`;
    console.error("  x Python/OpenCV:", state.lastError, "(face detection will degrade to center-crop)");
  }

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
  let queue: RedisQueue<JobPayload> | null = null;
  if (!process.env.REDIS_URL) {
    console.error("  x REDIS_URL not set");
  } else {
    try {
      queue = new RedisQueue<JobPayload>(process.env.REDIS_URL);
      state.redis = await queue.ping();
      console.log(state.redis ? "  > Connected to Redis" : "  x Redis ping failed");
    } catch (err) {
      state.lastError = `redis: ${err instanceof Error ? err.message : String(err)}`;
      console.error("  x Redis:", state.lastError);
    }
  }

  // S3 / R2 (production) or local fallback (dev)
  let storage: StorageBackend | null = null;
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
    const localDir = process.env.WORKER_STORAGE_DIR ?? join(process.cwd(), "worker-storage");
    storage = new LocalArtifactStorage(localDir);
    state.r2 = true;
    console.log(`  > Using local storage: ${localDir}`);
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

  // Job loop — polls Redis AND PostgreSQL for jobs
  while (running) {
    try {
      if (queue) {
        const msg = await queue.dequeue();
        if (msg) {
          state.lastJobAt = new Date().toISOString();
          await processJob(msg, repo, storage);
          await queue.ack(msg.id);
          continue;
        }
      }

      if (repo) {
        const pgJob = await pollPgJob(repo);
        if (pgJob) {
          state.lastJobAt = new Date().toISOString();
          await processPgJob(pgJob, repo, storage);
          continue;
        }
      }

      await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
      console.error("  Worker loop error:", state.lastError);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Ingestion + Engine pipeline                                                */
/* -------------------------------------------------------------------------- */

interface JobPayload {
  type: string;
  sourceUrl?: string;
  sourcePath?: string;
  config?: Partial<EngineConfig>;
}

/** Stage → progress percent, for the engine's stage → number mapping. */
const STAGE_PROGRESS: Record<string, number> = {
  probe: 5,
  "audio-extract": 12,
  transcribe: 28,
  understand: 38,
  candidates: 55,
  score: 62,
  select: 65,
  render: 75,
  finalize: 98,
};

/** Resolve a local source file: use existing local path, otherwise download from URL. */
async function resolveLocalSource(
  project: Awaited<ReturnType<ProjectRepository["getProject"]>> | null,
  payload: JobPayload,
): Promise<string> {
  if (payload.sourcePath && existsSync(payload.sourcePath)) return payload.sourcePath;
  if (project?.sourcePath && existsSync(project.sourcePath)) return project.sourcePath;

  const url = payload.sourceUrl ?? project?.sourceUrl;
  if (url) {
    const result = await downloadFromUrl(url, join(WORKER_WORKDIR, "downloads"));
    return result.filePath;
  }
  throw new Error("No source path and no source URL available to process.");
}

/** Build the engine config from the project's stored config + payload overrides. */
function buildEngineConfig(projectId: string, outputDir: string, overrides?: Partial<EngineConfig>): EngineConfig {
  const base: EngineConfig = {
    projectId,
    outputDir,
    targetClips: 10,
    minClipDuration: 20,
    maxClipDuration: 90,
    preferredClipDuration: 45,
    candidateStride: 5,
    aspectRatio: "9:16",
    mode: "podcast",
    captionStyle: "modern",
    reframe: "center-crop",
    pausePolicy: { cutPausesLongerThan: 0.45, keepPause: 0.18, minimumCut: 0.12 },
    weights: { hook: 0.20, emotion: 0.15, novelty: 0.15, information: 0.15, curiosity: 0.10, payoff: 0.15, coherence: 0.10 },
    transcription: {
      provider: "silence-based-fallback",
      model: "heuristic",
      language: null,
      minimumScore: 20,
      duplicateThreshold: 0.55,
      analysisModel: "heuristic-local",
    },
    render: {
      path: "ffmpeg", width: 1080, height: 1920, fps: 30,
      videoBitrate: "0", audioBitrate: "192k",
      preset: "veryfast", crf: 23, pixelFormat: "yuv420p",
      fastStart: true, audioSampleRate: 48000,
      colorRange: "limited", background: "#000000", videoCodec: "libx264",
    },
    thumbnail: { at: 0.5, width: 1080, height: 1920, format: "jpg", quality: 3 },
    preview: { enabled: false, maxSeconds: 30, scale: 0.5 },
    keepIntermediate: false,
    captionsEnabled: true,
    concurrency: WORKER_CONCURRENCY,
    seed: 42,
  };
  return { ...base, ...overrides };
}

/** Bridge the engine's progress events to the job record. */
async function bridgeProgress(jobId: string, repo: ProjectRepository | null, evt: { stage: string; progress: number; message: string }): Promise<void> {
  const stageProgress = STAGE_PROGRESS[evt.stage] ?? 0;
  const clamped = Math.max(stageProgress, Math.round(evt.progress * 100));
  if (repo) await repo.updateJob(jobId, { progress: clamped, message: `${evt.stage}: ${evt.message}` });
}

/** Upload a single clip + create its DB row. */
async function persistClip(
  clip: EngineOutput["clips"][number],
  clipIndex: number,
  storage: StorageBackend,
  repo: ProjectRepository,
  projectId: string,
): Promise<void> {
  const videoKey = `projects/${projectId}/clips/${clipIndex}/${clip.index}.mp4`;
  const thumbKey = `projects/${projectId}/clips/${clipIndex}/${clip.index}.jpg`;
  const videoBuf = readFileSync(clip.videoPath);
  await storage.put(videoKey, videoBuf, { contentType: "video/mp4" });
  try {
    await storage.put(thumbKey, readFileSync(clip.thumbnailPath), { contentType: "image/jpeg" });
  } catch { /* thumbnail missing — non-fatal */ }
  await repo.createClip({
    id: `clip-${projectId}-${clip.index}`,
    projectId,
    index: clip.index,
    sourceStart: 0, sourceEnd: 0,
    score: clip.score,
    status: "rendered",
    profileName: "podcast",
    directorPlan: {
      hook: clip.hook, pacing: "natural", visualStyle: "clean", musicStrategy: "none",
      captionStrategy: "standard", framingStrategy: "center", effects: [],
      transitions: [], emphasisMoments: [], reasoning: "", confidence: 50,
    },
    artifacts: { video: videoKey, thumbnail: thumbKey },
  } as any);
}

/**
 * Real job processing: downloads (if URL), runs the engine, uploads clips.
 */
async function processJob(
  msg: { id: string; jobId: string; projectId: string; payload: JobPayload },
  repo: PostgresRepository | null,
  storage: StorageBackend | null,
): Promise<void> {
  console.log(`\n  Job ${msg.jobId} (${msg.payload?.type ?? "unknown"})`);
  const started = Date.now();
  try {
    await repo?.updateJob(msg.jobId, { status: "running", startedAt: new Date().toISOString(), message: "Picked up job" });

    const project = await repo?.getProject(msg.projectId);
    const provider = (process.env.CLIPFORGE_PROVIDER ?? "heuristic") as "heuristic" | "openai" | "hybrid";
    const config = buildEngineConfig(msg.projectId, join(WORKER_WORKDIR, msg.projectId), msg.payload?.config);

    // Ingest
    await repo?.updateJob(msg.jobId, { progress: 8, message: "Ingesting source video" });
    const localPath = await resolveLocalSource(project ?? null, msg.payload);
    await repo?.updateJob(msg.jobId, { message: `Ingested: ${localPath}` });

    // Run the engine
    const result = await runEngine({
      videoPath: localPath,
      config,
      provider,
      progress: (evt) => void bridgeProgress(msg.jobId, repo, evt),
    });

    if (result.status !== "completed") {
      throw new Error(result.error ?? "Engine failed");
    }

    // Upload clips + thumbnails, persist to DB
    if (storage && repo) {
      if (result.clips.length > 0) {
        await repo.updateJob(msg.jobId, { progress: 90, message: `Uploading ${result.clips.length} clips...` });
        for (const clip of result.clips) {
          await persistClip(clip, 0, storage, repo, msg.projectId);
        }
      }
      await repo.updateProject(msg.projectId, { status: "completed" });
    }

    const doneMessage = result.clips.length > 0
      ? `Completed: ${result.clips.length} clips in ${((Date.now() - started) / 1000).toFixed(1)}s`
      : `Completed — no clip-worthy moments found in ${((Date.now() - started) / 1000).toFixed(1)}s`;
    await repo?.updateJob(msg.jobId, {
      status: "completed", progress: 100,
      completedAt: new Date().toISOString(),
      message: doneMessage,
    });
    console.log(`  OK Job ${msg.jobId} completed (${result.clips.length} clips)`);
    state.jobsProcessed++;
  } catch (err) {
    state.jobsFailed++;
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL Job ${msg.jobId}:`, state.lastError);
    try {
      await repo?.updateJob(msg.jobId, {
        status: "failed",
        error: { code: "WORKER_ERROR", message: state.lastError },
        completedAt: new Date().toISOString(),
      });
      if (repo) await repo.updateProject(msg.projectId, { status: "failed" });
    } catch { /* ignore */ }
  }
}

interface PgJob {
  id: string;
  project_id: string;
  type: string;
  input: Record<string, unknown>;
}

async function pollPgJob(repo: PostgresRepository): Promise<PgJob | null> {
  try {
    const result = await (repo as any).pool?.query?.(
      `UPDATE jobs SET status = 'running', locked_by = $1, locked_at = now(), started_at = now()
       WHERE id = (
         SELECT id FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
       )
       RETURNING id, project_id, type, input`,
      [WORKER_ID],
    );
    if (!result || !result.rows || result.rows.length === 0) return null;
    return result.rows[0];
  } catch {
    return null;
  }
}

async function processPgJob(job: PgJob, repo: PostgresRepository | null, storage: StorageBackend | null): Promise<void> {
  const payload: JobPayload = { type: job.type, ...(job.input ?? {}) } as JobPayload;
  console.log(`\n  PG Job ${job.id} (${job.type})`);
  const started = Date.now();
  try {
    await repo?.updateJob(job.id, { status: "running", startedAt: new Date().toISOString(), message: "Picked up job" });

    const project = await repo?.getProject(job.project_id);
    const provider = (process.env.CLIPFORGE_PROVIDER ?? "heuristic") as "heuristic" | "openai" | "hybrid";
    const config = buildEngineConfig(job.project_id, join(WORKER_WORKDIR, job.project_id), payload.config);

    await repo?.updateJob(job.id, { progress: 8, message: "Ingesting source video" });
    const localPath = await resolveLocalSource(project ?? null, payload);
    await repo?.updateJob(job.id, { message: `Ingested: ${localPath}` });

    const result = await runEngine({
      videoPath: localPath,
      config,
      provider,
      progress: (evt) => void bridgeProgress(job.id, repo, evt),
    });

    if (result.status !== "completed") {
      throw new Error(result.error ?? "Engine failed");
    }

    if (storage && repo) {
      if (result.clips.length > 0) {
        await repo.updateJob(job.id, { progress: 90, message: `Uploading ${result.clips.length} clips...` });
        for (const clip of result.clips) {
          await persistClip(clip, 0, storage, repo, job.project_id);
        }
      }
      await repo.updateProject(job.project_id, { status: "completed" });
    }

    const doneMessage = result.clips.length > 0
      ? `Completed: ${result.clips.length} clips in ${((Date.now() - started) / 1000).toFixed(1)}s`
      : `Completed — no clip-worthy moments found in ${((Date.now() - started) / 1000).toFixed(1)}s`;
    await repo?.updateJob(job.id, {
      status: "completed", progress: 100,
      completedAt: new Date().toISOString(),
      message: doneMessage,
    });
    console.log(`  OK PG Job ${job.id} completed (${result.clips.length} clips)`);
    state.jobsProcessed++;
  } catch (err) {
    state.jobsFailed++;
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL PG Job ${job.id}:`, state.lastError);
    try {
      await repo?.updateJob(job.id, {
        status: "failed",
        error: { code: "WORKER_ERROR", message: state.lastError },
        completedAt: new Date().toISOString(),
      });
      if (repo) await repo.updateProject(job.project_id, { status: "failed" });
    } catch { /* ignore */ }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { processJob, processPgJob, buildEngineConfig, resolveLocalSource };

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});