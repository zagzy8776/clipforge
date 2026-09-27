import type { Project, ProjectClip } from "@clipforge/types";
import type { ProjectRepository, Job } from "../repository.js";

/**
 * In-memory repository for development and testing.
 * No persistence — data is lost when the process exits.
 */
export class MemoryRepository implements ProjectRepository {
  private projects = new Map<string, Project>();
  private clips = new Map<string, ProjectClip>();
  private jobs = new Map<string, Job>();

  async listProjects(): Promise<Project[]> {
    return [...this.projects.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getProject(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null;
  }

  async createProject(project: Project): Promise<Project> {
    this.projects.set(project.id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error(`Project ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
    // Cascade: remove clips and jobs
    for (const [k, v] of this.clips) {
      if (v.id.startsWith(id)) this.clips.delete(k);
    }
    for (const [k, v] of this.jobs) {
      if (v.projectId === id) this.jobs.delete(k);
    }
  }

  async getClips(projectId: string): Promise<ProjectClip[]> {
    return [...this.clips.values()].filter((c) => c.id.startsWith(projectId));
  }

  async getClip(clipId: string): Promise<ProjectClip | null> {
    return this.clips.get(clipId) ?? null;
  }

  async createClip(clip: ProjectClip): Promise<ProjectClip> {
    this.clips.set(clip.id, clip);
    return clip;
  }

  async updateClip(clipId: string, updates: Partial<ProjectClip>): Promise<ProjectClip> {
    const existing = this.clips.get(clipId);
    if (!existing) throw new Error(`Clip ${clipId} not found`);
    const updated = { ...existing, ...updates };
    this.clips.set(clipId, updated);
    return updated;
  }

  async deleteClip(clipId: string): Promise<void> {
    this.clips.delete(clipId);
  }

  async listJobs(projectId: string): Promise<Job[]> {
    return [...this.jobs.values()].filter((j) => j.projectId === projectId);
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async createJob(job: Omit<Job, "id" | "createdAt">): Promise<Job> {
    const full: Job = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(full.id, full);
    return full;
  }

  async updateJob(jobId: string, updates: Partial<Job>): Promise<Job> {
    const existing = this.jobs.get(jobId);
    if (!existing) throw new Error(`Job ${jobId} not found`);
    const updated = { ...existing, ...updates };
    this.jobs.set(jobId, updated);
    return updated;
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "cancelled";
      job.completedAt = new Date().toISOString();
    }
  }
}
