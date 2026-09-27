import type { Project, ProjectClip } from "@clipforge/types";

/* -------------------------------------------------------------------------- */
/* Repository interface — storage-agnostic data layer                         */
/* -------------------------------------------------------------------------- */

export interface ProjectRepository {
  // Projects
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(project: Project): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Clips
  getClips(projectId: string): Promise<ProjectClip[]>;
  getClip(clipId: string): Promise<ProjectClip | null>;
  createClip(clip: ProjectClip): Promise<ProjectClip>;
  updateClip(clipId: string, updates: Partial<ProjectClip>): Promise<ProjectClip>;
  deleteClip(clipId: string): Promise<void>;

  // Jobs
  listJobs(projectId: string): Promise<Job[]>;
  getJob(jobId: string): Promise<Job | null>;
  createJob(job: Omit<Job, "id" | "createdAt">): Promise<Job>;
  updateJob(jobId: string, updates: Partial<Job>): Promise<Job>;
  cancelJob(jobId: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Job model                                                                   */
/* -------------------------------------------------------------------------- */

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type JobType = "ingest" | "transcribe" | "analyze" | "direct" | "render" | "validate" | "export";

export interface Job {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  /** 0-100 progress. */
  progress: number;
  /** Human-readable status message. */
  message: string;
  /** Structured error if failed. */
  error?: { code: string; message: string; stack?: string };
  /** Input parameters. */
  input: Record<string, unknown>;
  /** Output artifacts produced. */
  artifacts: string[];
  /** Timestamps. */
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  /** Retry count. */
  retries: number;
  /** Maximum retries before giving up. */
  maxRetries: number;
}
