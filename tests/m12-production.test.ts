import { describe, it, expect } from "vitest";
import { MemoryRepository, LocalArtifactStorage, MemoryQueue, runPipeline } from "../packages/storage/src/index";
import { ClipForgeService } from "../packages/api/src/services/clipforge-service";
import { registerApiKey, validateApiKey, generateApiKey } from "../packages/api/src/middleware/auth";
import { registerWebhook, getWebhooks } from "../packages/api/src/webhooks";

describe("M12 Production Funnel — Integration", () => {
  it("complete production funnel: project → process → clips", async () => {
    const repo = new MemoryRepository();
    const service = new ClipForgeService(repo);

    // 1. Create project
    const { projectId } = await service.createProject({ name: "Test Video", sourcePath: "/test.mp4" });
    expect(projectId).toBeTruthy();

    // 2. Process project
    const result = await service.processProject(projectId, { sourcePath: "/test.mp4" });
    expect(result.status).toBe("completed");

    // 3. Verify project exists after processing
    const project = await service.getProject(projectId);
    expect(project).not.toBeNull();
    expect(project!.status).toBe("completed");

    // 4. List projects
    const allProjects = await service.listProjects();
    expect(allProjects.length).toBeGreaterThanOrEqual(1);
  });

  it("API key authentication works", () => {
    const key = generateApiKey();
    registerApiKey(key, "proj-123");

    const valid = validateApiKey(`Bearer ${key}`);
    expect(valid.valid).toBe(true);
    expect(valid.projectId).toBe("proj-123");

    const invalid = validateApiKey("Bearer bad-key");
    expect(invalid.valid).toBe(false);
  });

  it("webhooks register and retrieve", () => {
    registerWebhook("proj-1", "https://example.com/hook");
    registerWebhook("proj-1", "https://example.com/hook2");
    expect(getWebhooks("proj-1")).toHaveLength(2);
  });

  it("artifact storage round-trip", async () => {
    const store = new LocalArtifactStorage("e:/video/.test-m12-artifacts");
    await store.put("test/video.mp4", Buffer.from("fake video data"));
    expect(await store.exists("test/video.mp4")).toBe(true);
    const data = await store.get("test/video.mp4");
    expect(data.toString()).toBe("fake video data");
    const info = await store.head("test/video.mp4");
    expect(info.size).toBeGreaterThan(0);
    const url = await store.getSignedUrl("test/video.mp4");
    expect(url.startsWith("file://")).toBe(true);
    await store.delete("test/video.mp4");
    expect(await store.exists("test/video.mp4")).toBe(false);
  });

  it("queue lifecycle: enqueue → dequeue → ack", async () => {
    const queue = new MemoryQueue();
    const id = await queue.enqueue({ jobId: "j1", projectId: "p1", payload: { type: "render" }, maxAttempts: 3 });
    expect(await queue.depth()).toBe(1);
    const msg = await queue.dequeue();
    expect(msg).not.toBeNull();
    expect(msg!.jobId).toBe("j1");
    await queue.ack(msg!.id);
    expect(await queue.depth()).toBe(0);
  });

  it("job system: pipeline → completion", async () => {
    const repo = new MemoryRepository();
    await repo.createProject({
      id: "proj-pipeline-test", name: "Pipeline Test", sourcePath: "/test.mp4", status: "created",
      segments: [], sections: [], candidates: [], clips: [],
      stats: { totalCandidates: 0, selectedClips: 0, validatedClips: 0, avgEngagement: 0, avgQuality: 0, totalRenderTimeMs: 0, totalSizeMB: 0 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const result = await runPipeline("proj-pipeline-test", repo, {
      ingest: async () => ({ artifacts: ["source.mp4"] }),
      transcribe: async () => ({ artifacts: ["transcript.json"] }),
      analyze: async () => ({ artifacts: ["analysis.json"] }),
      direct: async () => ({ artifacts: ["director.json"] }),
      render: async () => ({ artifacts: ["clip-01.mp4"] }),
      validate: async () => ({ artifacts: [] }),
    });

    expect(result.success).toBe(true);
    expect(result.stages.length).toBe(6);

    const jobs = await repo.listJobs("proj-pipeline-test");
    expect(jobs.length).toBe(6);
    expect(jobs.every((j) => j.status === "completed")).toBe(true);
  });
});
