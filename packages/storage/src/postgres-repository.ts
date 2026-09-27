import type { Project, ProjectClip } from "@clipforge/types";
import type { ProjectRepository, Job } from "../repository.js";
import { createRequire } from "node:module";

export class PostgresRepository implements ProjectRepository {
  private pool: any;

  constructor(connStr: string) {
    const req = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = req("pg");
    this.pool = new Pool({ connectionString: connStr, max: 10, ssl: { rejectUnauthorized: false } });
  }

  async listProjects(): Promise<Project[]> {
    const { rows } = await this.pool.query("SELECT * FROM projects ORDER BY created_at DESC");
    return rows.map(this.rowToProject);
  }

  async getProject(id: string): Promise<Project | null> {
    const { rows } = await this.pool.query("SELECT * FROM projects WHERE id=$1", [id]);
    return rows[0] ? this.rowToProject(rows[0]) : null;
  }

  async createProject(p: Project): Promise<Project> {
    await this.pool.query(
      "INSERT INTO projects(id,user_id,name,status,config,stats,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [p.id, "system", p.name, p.status, JSON.stringify(p.config ?? {}), JSON.stringify(p.stats), p.createdAt, p.updatedAt]
    );
    return p;
  }

  async updateProject(id: string, u: Partial<Project>): Promise<Project> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [k, val] of Object.entries(u)) {
      if (k === "id") continue;
      fields.push(k + "=$" + idx++);
      values.push(typeof val === "object" ? JSON.stringify(val) : val);
    }
    fields.push("updated_at=$" + idx++);
    values.push(new Date().toISOString());
    values.push(id);
    await this.pool.query("UPDATE projects SET " + fields.join(", ") + " WHERE id=$" + idx, values);
    return (await this.getProject(id))!;
  }

  async deleteProject(id: string): Promise<void> {
    await this.pool.query("DELETE FROM projects WHERE id=$1", [id]);
  }

  async getClips(pid: string): Promise<ProjectClip[]> {
    const { rows } = await this.pool.query("SELECT * FROM clips WHERE project_id=$1 ORDER BY rank", [pid]);
    return rows.map(this.rowToClip);
  }

  async getClip(cid: string): Promise<ProjectClip | null> {
    const { rows } = await this.pool.query("SELECT * FROM clips WHERE id=$1", [cid]);
    return rows[0] ? this.rowToClip(rows[0]) : null;
  }

  async createClip(c: ProjectClip): Promise<ProjectClip> {
    await this.pool.query(
      "INSERT INTO clips(id,project_id,rank,source_start,source_end,duration_seconds,score,status,profile_name,director_plan) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [c.id, c.index, c.rank ?? c.index, c.sourceStart, c.sourceEnd, c.sourceEnd - c.sourceStart, c.score, c.status, c.profileName, JSON.stringify(c.directorPlan)]
    );
    return c;
  }

  async updateClip(cid: string, u: Partial<ProjectClip>): Promise<ProjectClip> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (u.status !== undefined) { fields.push("status=$" + idx++); values.push(u.status); }
    if (u.score !== undefined) { fields.push("score=$" + idx++); values.push(u.score); }
    if (u.directorPlan !== undefined) { fields.push("director_plan=$" + idx++); values.push(JSON.stringify(u.directorPlan)); }
    if (fields.length === 0) return (await this.getClip(cid))!;
    values.push(cid);
    await this.pool.query("UPDATE clips SET " + fields.join(", ") + " WHERE id=$" + idx, values);
    return (await this.getClip(cid))!;
  }

  async deleteClip(cid: string): Promise<void> {
    await this.pool.query("DELETE FROM clips WHERE id=$1", [cid]);
  }

  async listJobs(pid: string): Promise<Job[]> {
    const { rows } = await this.pool.query("SELECT * FROM jobs WHERE project_id=$1 ORDER BY created_at", [pid]);
    return rows.map(this.rowToJob);
  }

  async getJob(jid: string): Promise<Job | null> {
    const { rows } = await this.pool.query("SELECT * FROM jobs WHERE id=$1", [jid]);
    return rows[0] ? this.rowToJob(rows[0]) : null;
  }

  async createJob(j: Omit<Job, "id" | "createdAt">): Promise<Job> {
    const id = "job-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    await this.pool.query(
      "INSERT INTO jobs(id,project_id,type,status,progress,message,input,artifacts,retries,max_retries,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [id, j.projectId, j.type, j.status, j.progress, j.message, JSON.stringify(j.input), j.artifacts, j.retries, j.maxRetries, now]
    );
    return { ...j, id, createdAt: now };
  }

  async updateJob(jid: string, u: Partial<Job>): Promise<Job> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    // Map camelCase keys to snake_case DB columns
    const columnMap: Record<string, string> = {
      projectId: "project_id", status: "status", progress: "progress",
      message: "message", input: "input", output: "output", error: "error",
      artifacts: "artifacts", retries: "retries", maxRetries: "max_retries",
      idempotencyKey: "idempotency_key", createdAt: "created_at",
      startedAt: "started_at", completedAt: "completed_at",
      lockedBy: "locked_by", lockedAt: "locked_at",
    };
    for (const [k, val] of Object.entries(u)) {
      if (k === "id" || k === "createdAt") continue;
      const col = columnMap[k] ?? k;
      fields.push(col + "=$" + idx++);
      values.push(typeof val === "object" ? JSON.stringify(val) : val);
    }
    if (fields.length === 0) return (await this.getJob(jid))!;
    values.push(jid);
    await this.pool.query("UPDATE jobs SET " + fields.join(", ") + " WHERE id=$" + idx, values);
    return (await this.getJob(jid))!;
  }

  async cancelJob(jid: string): Promise<void> {
    await this.pool.query("UPDATE jobs SET status='cancelled', completed_at=$1 WHERE id=$2", [new Date().toISOString(), jid]);
  }

  private rowToProject(r: any): Project {
    return {
      id: r.id, name: r.name, sourcePath: r.config?.sourcePath ?? "", status: r.status,
      segments: [], sections: [], candidates: [], clips: [],
      stats: r.stats ?? { totalCandidates: 0, selectedClips: 0, validatedClips: 0, avgEngagement: 0, avgQuality: 0, totalRenderTimeMs: 0, totalSizeMB: 0 },
      createdAt: r.created_at?.toISOString?.() ?? r.created_at, updatedAt: r.updated_at?.toISOString?.() ?? r.updated_at,
    };
  }

  private rowToClip(r: any): ProjectClip {
    return {
      id: r.id, index: r.rank ?? 0, sourceStart: r.source_start, sourceEnd: r.source_end,
      directorPlan: typeof r.director_plan === "string" ? JSON.parse(r.director_plan) : r.director_plan ?? { hook: "", pacing: "natural", visualStyle: "clean", musicStrategy: "none", captionStrategy: "standard", framingStrategy: "center", effects: [], transitions: [], emphasisMoments: [], reasoning: "", confidence: 0 },
      profileName: r.profile_name ?? "podcast",
      evaluation: typeof r.evaluation === "string" ? JSON.parse(r.evaluation) : r.evaluation,
      artifacts: {}, status: r.status, score: r.score ?? 0,
    };
  }

  private rowToJob(r: any): Job {
    return {
      id: r.id, projectId: r.project_id, type: r.type, status: r.status,
      progress: r.progress ?? 0, message: r.message ?? "",
      input: typeof r.input === "string" ? JSON.parse(r.input) : r.input ?? {},
      error: r.error ? (typeof r.error === "string" ? JSON.parse(r.error) : r.error) : undefined,
      artifacts: r.artifacts ?? [],
      createdAt: r.created_at?.toISOString?.() ?? r.created_at,
      startedAt: r.started_at?.toISOString?.() ?? r.started_at,
      completedAt: r.completed_at?.toISOString?.() ?? r.completed_at,
      retries: r.retries ?? 0, maxRetries: r.max_retries ?? 2,
    };
  }
}
