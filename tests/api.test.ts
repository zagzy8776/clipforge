import { describe, it, expect } from "vitest";
import { validateApiKey, registerApiKey, generateApiKey } from "../packages/api/src/middleware/auth";
import { registerWebhook, sendWebhook, getWebhooks, type WebhookEvent } from "../packages/api/src/webhooks";
import { MemoryRepository } from "../packages/storage/src/index";
import { ClipForgeService } from "../packages/api/src/services/clipforge-service";

describe("API Key Auth", () => {
  it("validates correct key", () => {
    const key = generateApiKey();
    registerApiKey(key);
    expect(validateApiKey(`Bearer ${key}`).valid).toBe(true);
  });

  it("rejects missing header", () => {
    expect(validateApiKey(null).valid).toBe(false);
  });

  it("rejects invalid key", () => {
    expect(validateApiKey("Bearer bad_key").valid).toBe(false);
  });

  it("rejects wrong format", () => {
    expect(validateApiKey("Basic abc123").valid).toBe(false);
  });

  it("generates unique keys", () => {
    const k1 = generateApiKey();
    const k2 = generateApiKey();
    expect(k1).not.toBe(k2);
    expect(k1.startsWith("cf_")).toBe(true);
  });
});

describe("Webhooks", () => {
  it("registers and retrieves webhooks", () => {
    registerWebhook("proj-1", "https://example.com/hook1");
    registerWebhook("proj-1", "https://example.com/hook2");
    registerWebhook("proj-2", "https://example.com/hook3");
    expect(getWebhooks("proj-1")).toHaveLength(2);
    expect(getWebhooks("proj-2")).toHaveLength(1);
    expect(getWebhooks("proj-nonexistent")).toHaveLength(0);
  });

  it("deduplicates webhook URLs", () => {
    registerWebhook("proj-dedup", "https://example.com/hook");
    registerWebhook("proj-dedup", "https://example.com/hook");
    expect(getWebhooks("proj-dedup")).toHaveLength(1);
  });

  it("sendWebhook doesn't throw on failure", async () => {
    registerWebhook("proj-fail", "https://invalid-url-that-does-not-exist.example.com/hook");
    // Should not throw — webhook failures are non-fatal
    await sendWebhook("proj-fail", { event: "job.completed", jobId: "j1", projectId: "proj-fail", type: "render" });
  });
});

describe("ClipForgeService", () => {
  it("creates and processes a project", async () => {
    const repo = new MemoryRepository();
    const service = new ClipForgeService(repo);

    const { projectId } = await service.createProject({ name: "Test", sourcePath: "/test.mp4" });
    expect(projectId).toBeTruthy();

    const project = await service.getProject(projectId);
    expect(project).not.toBeNull();
    expect(project!.name).toBe("Test");

    const result = await service.processProject(projectId, { sourcePath: "/test.mp4" });
    expect(result.status).toBe("completed");
    expect(result.projectId).toBe(projectId);
  });

  it("lists projects", async () => {
    const repo = new MemoryRepository();
    const service = new ClipForgeService(repo);
    await service.createProject({ name: "A", sourcePath: "/a.mp4" });
    await service.createProject({ name: "B", sourcePath: "/b.mp4" });
    const list = await service.listProjects();
    expect(list.length).toBe(2);
  });

  it("fails on missing project", async () => {
    const repo = new MemoryRepository();
    const service = new ClipForgeService(repo);
    await expect(service.processProject("nonexistent", { sourcePath: "/x.mp4" }))
      .rejects.toThrow("Project nonexistent not found");
  });
});
