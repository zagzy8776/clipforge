/**
 * Structured metrics for every pipeline stage.
 * Each log entry includes jobId, projectId, stage, and timing.
 */

export interface PipelineMetrics {
  jobId: string;
  projectId: string;
  /** Source video duration in seconds. */
  sourceDuration?: number;
  /** Per-stage timing in milliseconds. */
  timings: {
    transcription?: number;
    analysis?: number;
    candidateGeneration?: number;
    scoring?: number;
    deduplication?: number;
    director?: number;
    rendering?: number;
    validation?: number;
    totalMs?: number;
  };
  /** Resource usage. */
  resources: {
    cpuTimeMs?: number;
    peakMemoryMB?: number;
    outputSizeMB?: number;
  };
  /** Content stats. */
  content: {
    candidateCount: number;
    selectedCount: number;
    duplicateCount: number;
    failedRenders: number;
  };
  /** When this metrics snapshot was created. */
  createdAt: string;
}

const metricsStore = new Map<string, PipelineMetrics>();

/** Record a metrics snapshot. */
export function recordMetrics(metrics: PipelineMetrics): void {
  metricsStore.set(metrics.jobId, metrics);
}

/** Get metrics for a job. */
export function getMetrics(jobId: string): PipelineMetrics | null {
  return metricsStore.get(jobId) ?? null;
}

/** Get all metrics for a project. */
export function getProjectMetrics(projectId: string): PipelineMetrics[] {
  return [...metricsStore.values()].filter((m) => m.projectId === projectId);
}

/** Get aggregate stats. */
export function getAggregateStats(): {
  totalJobs: number;
  avgTotalMs: number;
  avgTranscriptionMs: number;
  avgRenderingMs: number;
  avgCandidateCount: number;
  totalOutputMB: number;
} {
  const all = [...metricsStore.values()];
  const n = all.length || 1;
  return {
    totalJobs: all.length,
    avgTotalMs: Math.round(all.reduce((a, m) => a + (m.timings.totalMs ?? 0), 0) / n),
    avgTranscriptionMs: Math.round(all.reduce((a, m) => a + (m.timings.transcription ?? 0), 0) / n),
    avgRenderingMs: Math.round(all.reduce((a, m) => a + (m.timings.rendering ?? 0), 0) / n),
    avgCandidateCount: Math.round(all.reduce((a, m) => a + m.content.candidateCount, 0) / n),
    totalOutputMB: Math.round(all.reduce((a, m) => a + (m.resources.outputSizeMB ?? 0), 0) * 100) / 100,
  };
}
