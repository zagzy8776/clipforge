import type { ProjectRepository } from "@clipforge/storage";
import { runPipeline } from "@clipforge/storage";

export interface ProcessOptions { sourcePath: string; profileName?: string; targetClips?: number; webhookUrl?: string; }
export interface ProcessResult { projectId: string; jobId: string; status: "queued"|"completed"|"failed"; message: string; }

export class ClipForgeService {
  private repo: ProjectRepository;
  constructor(repo: ProjectRepository) { this.repo = repo; }

  async createProject(opts: { name: string; sourcePath: string }) {
    const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await this.repo.createProject({
      id, name: opts.name, sourcePath: opts.sourcePath, status: "created",
      segments: [], sections: [], candidates: [], clips: [],
      stats: { totalCandidates: 0, selectedClips: 0, validatedClips: 0, avgEngagement: 0, avgQuality: 0, totalRenderTimeMs: 0, totalSizeMB: 0 },
      createdAt: now, updatedAt: now,
    });
    return { projectId: id };
  }

  async processProject(projectId: string, _opts: ProcessOptions): Promise<ProcessResult> {
    const project = await this.repo.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    await this.repo.updateProject(projectId, { status: "ingesting" });
    const result = await runPipeline(projectId, this.repo, {
      ingest: async (_j, up) => { await up(10, "Ingesting"); return {}; },
      transcribe: async (_j, up) => { await up(25, "Transcribing"); return {}; },
      analyze: async (_j, up) => { await up(40, "Analyzing"); return {}; },
      direct: async (_j, up) => { await up(60, "Directing"); return {}; },
      render: async (_j, up) => { await up(80, "Rendering"); return {}; },
      validate: async (_j, up) => { await up(95, "Validating"); return {}; },
    });
    await this.repo.updateProject(projectId, { status: result.success ? "completed" : "failed" });
    return { projectId, jobId: result.stages[0]?.jobId ?? "", status: result.success ? "completed" : "failed", message: result.success ? "Done" : "Failed" };
  }

  async getProject(id: string) { return this.repo.getProject(id); }
  async listProjects() { return this.repo.listProjects(); }
  async getClips(projectId: string) { return this.repo.getClips(projectId); }
  async getJob(jobId: string) { return this.repo.getJob(jobId); }
  async cancelJob(jobId: string) { return this.repo.cancelJob(jobId); }
}
