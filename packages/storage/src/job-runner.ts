import type { Job, JobStatus, JobType, ProjectRepository } from "./repository.js";

export type PipelineStage = "ingest" | "transcribe" | "analyze" | "direct" | "render" | "validate" | "export";

const STAGE_ORDER: PipelineStage[] = ["ingest", "transcribe", "analyze", "direct", "render", "validate"];

/**
 * Run a pipeline of jobs for a project.
 * Each stage creates a job, runs it, and updates progress.
 */
export async function runPipeline(
  projectId: string,
  repo: ProjectRepository,
  handlers: Partial<Record<PipelineStage, (job: Job, update: (progress: number, msg: string) => Promise<void>) => Promise<Record<string, unknown>>>>,
  options?: { onStageComplete?: (stage: PipelineStage, result: Record<string, unknown>) => Promise<void> },
): Promise<{ success: boolean; stages: Array<{ stage: PipelineStage; jobId: string; status: JobStatus }> }> {
  const results: Array<{ stage: PipelineStage; jobId: string; status: JobStatus }> = [];

  for (const stage of STAGE_ORDER) {
    const handler = handlers[stage];
    if (!handler) continue;

    // Check if job was cancelled
    const existingJobs = await repo.listJobs(projectId);
    const cancelled = existingJobs.find((j) => j.type === stage && j.status === "cancelled");
    if (cancelled) {
      results.push({ stage, jobId: cancelled.id, status: "cancelled" });
      continue;
    }

    // Create job
    const job = await repo.createJob({
      projectId,
      type: stage as JobType,
      status: "queued",
      progress: 0,
      message: `Queued: ${stage}`,
      input: {},
      artifacts: [],
      retries: 0,
      maxRetries: 2,
    });

    // Run job with retries
    let succeeded = false;
    for (let attempt = 0; attempt <= job.maxRetries && !succeeded; attempt++) {
      try {
        if (attempt > 0) {
          await repo.updateJob(job.id, { retries: attempt, status: "running", message: `Retrying: ${stage} (attempt ${attempt + 1})` });
        } else {
          await repo.updateJob(job.id, { status: "running", startedAt: new Date().toISOString(), message: `Running: ${stage}` });
        }
        const result = await handler(job, async (progress, msg) => { await repo.updateJob(job.id, { progress, message: msg }); });
        await repo.updateJob(job.id, { status: "completed", progress: 100, completedAt: new Date().toISOString(), message: `Completed: ${stage}`, artifacts: [] });
        results.push({ stage, jobId: job.id, status: "completed" });
        await options?.onStageComplete?.(stage, result);
        succeeded = true;
      } catch (err) {
        if (attempt >= job.maxRetries) {
          const error = err instanceof Error ? { code: "PIPELINE_ERROR", message: err.message } : { code: "UNKNOWN", message: String(err) };
          await repo.updateJob(job.id, { status: "failed", error, completedAt: new Date().toISOString(), message: `Failed: ${stage}` });
          results.push({ stage, jobId: job.id, status: "failed" });
        }
      }
    }
    if (!succeeded) break; // Stop pipeline on unrecoverable failure
  }

  const allCompleted = results.every((r) => r.status === "completed" || r.status === "cancelled");
  return { success: allCompleted, stages: results };
}
