import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryRepository } from "../packages/storage/src/memory-repository.js";
import { LocalArtifactStorage } from "../packages/storage/src/artifact-storage.js";
import { processJob } from "../worker/src/index.js";
import type { EngineConfig } from "../packages/types/src/index.js";

// Repo-relative fixture path so the test runs on any OS / CI environment.
// Generate it first with: pnpm generate:fixture
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "..", "input", "test-fixture.mp4");
const OUTPUT_DIR = join(__dirname, "..", "output", "worker-test");
const STORAGE_DIR = join(__dirname, "..", "output", "worker-storage");

const config: EngineConfig = {
  projectId: "test-project",
  outputDir: OUTPUT_DIR,
  targetClips: 3,
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
  concurrency: 1,
  seed: 42,
};

describe("Worker — real engine end-to-end", () => {
  it("runs a real job through the engine and produces clips", async () => {
    if (!existsSync(FIXTURE)) {
      console.log(`  ⚠ Fixture missing: ${FIXTURE}. Run "pnpm generate:fixture" first; skipping.`);
      return;
    }
    const repo = new MemoryRepository();
    const storage = new LocalArtifactStorage(STORAGE_DIR);

    await repo.createProject({
      id: "test-project",
      name: "Worker E2E",
      sourcePath: FIXTURE,
      status: "created",
      segments: [], sections: [], candidates: [], clips: [],
      stats: { totalCandidates: 0, selectedClips: 0, validatedClips: 0, avgEngagement: 0, avgQuality: 0, totalRenderTimeMs: 0, totalSizeMB: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const job = await repo.createJob({
      projectId: "test-project",
      type: "render",
      status: "queued",
      progress: 0,
      message: "queued",
      input: { type: "render", sourcePath: FIXTURE, config },
      artifacts: [],
      retries: 0,
      maxRetries: 2,
    });

    await processJob({ id: job.id, jobId: job.id, projectId: "test-project", payload: { type: "render", sourcePath: FIXTURE, config } }, repo, storage);

    const updatedJob = await repo.getJob(job.id);
    expect(updatedJob?.status).toBe("completed");
    expect(updatedJob?.progress).toBe(100);

    const clips = await repo.getClips("test-project");
    expect(clips.length).toBeGreaterThan(0);
    expect(clips[0]!.artifacts.video).toBeTruthy();
    expect(clips[0]!.status).toBe("rendered");

    const project = await repo.getProject("test-project");
    expect(project?.status).toBe("completed");
  }, 300_000);
});