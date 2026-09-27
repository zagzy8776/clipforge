import type { DirectorPlan } from "@clipforge/types";
import type { CandidateMoment } from "@clipforge/types";
import type { ValidationResult } from "@clipforge/ffmpeg";

export interface ClipEvaluation {
  /** Unique evaluation ID. */
  id: string;
  /** Source video identifier. */
  sourceVideo: string;
  /** The candidate that was selected. */
  candidate: {
    start: number;
    end: number;
    text: string;
    score: number;
  };
  /** The DirectorPlan used. */
  directorPlan: DirectorPlan;
  /** Style chosen. */
  style: string;
  /** Render validation result. */
  validation: ValidationResult;
  /** File paths for this clip. */
  artifacts: {
    videoPath: string;
    thumbnailPath: string;
    editPlanPath: string;
    manifestPath: string;
  };
  /** File sizes in bytes. */
  fileSize: number | null;
  /** Wall-clock render time in ms. */
  renderTimeMs: number;
  /** When this evaluation was created. */
  createdAt: string;
}

export interface EvaluationReport {
  /** Summary statistics. */
  summary: {
    totalClips: number;
    validated: number;
    degraded: number;
    failed: number;
    avgConfidence: number;
    avgRenderTimeMs: number;
    totalSizeMB: number;
  };
  /** Per-clip evaluations. */
  evaluations: ClipEvaluation[];
  /** Per-style breakdown. */
  byStyle: Record<string, { count: number; avgConfidence: number; avgScore: number }>;
}

/**
 * Create a ClipEvaluation from processing results.
 */
export function createEvaluation(input: {
  sourceVideo: string;
  candidate: CandidateMoment;
  directorPlan: DirectorPlan;
  style: string;
  validation: ValidationResult;
  videoPath: string;
  thumbnailPath: string;
  editPlanPath: string;
  manifestPath: string;
  fileSize: number | null;
  renderTimeMs: number;
}): ClipEvaluation {
  return {
    id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceVideo: input.sourceVideo,
    candidate: {
      start: input.candidate.start,
      end: input.candidate.end,
      text: input.candidate.text.slice(0, 200),
      score: input.candidate.score.overall,
    },
    directorPlan: input.directorPlan,
    style: input.style,
    validation: input.validation,
    artifacts: {
      videoPath: input.videoPath,
      thumbnailPath: input.thumbnailPath,
      editPlanPath: input.editPlanPath,
      manifestPath: input.manifestPath,
    },
    fileSize: input.fileSize,
    renderTimeMs: input.renderTimeMs,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate an evaluation report from a list of evaluations.
 */
export function generateReport(evaluations: ClipEvaluation[]): EvaluationReport {
  const validated = evaluations.filter((e) => e.validation.status === "VALIDATED").length;
  const degraded = evaluations.filter((e) => e.validation.status === "DEGRADED").length;
  const failed = evaluations.filter((e) => e.validation.status === "FAILED").length;
  const avgConf = evaluations.reduce((a, e) => a + e.directorPlan.confidence, 0) / Math.max(1, evaluations.length);
  const avgRender = evaluations.reduce((a, e) => a + e.renderTimeMs, 0) / Math.max(1, evaluations.length);
  const totalMB = evaluations.reduce((a, e) => a + ((e.fileSize ?? 0) / (1024 * 1024)), 0);

  const byStyle: Record<string, { count: number; avgConfidence: number; avgScore: number }> = {};
  for (const e of evaluations) {
    const s = byStyle[e.style];
    if (s) {
      s.count++;
      s.avgConfidence += (e.directorPlan?.confidence ?? 0);
      s.avgScore += (e.candidate?.score ?? 0);
    }
  }
  for (const s of Object.values(byStyle)) {
    s.avgConfidence = Math.round(s.avgConfidence / s.count);
    s.avgScore = Math.round(s.avgScore / s.count * 10) / 10;
  }

  return {
    summary: {
      totalClips: evaluations.length,
      validated,
      degraded,
      failed,
      avgConfidence: Math.round(avgConf),
      avgRenderTimeMs: Math.round(avgRender),
      totalSizeMB: Math.round(totalMB * 100) / 100,
    },
    evaluations,
    byStyle,
  };
}

export { evaluateCreative, type CreativeEvalInput } from "./creative-eval.js";

export { generateBenchmarkReport, type AutomatedClipEval, type BenchmarkReport } from "./report.js";
export { type FailureCode, FAILURE_DESCRIPTIONS, type HumanReview, type VideoCategory, type BenchmarkVideo } from "./benchmark.js";
export { attributeFailures, type FailureAttribution, type FailureOrigin } from "./failure-attribution.js";
export { createReviewBatch, submitReview, getReviews, aggregateReviews, type ReviewBatch } from "./reviews.js";
