import type { FailureCode, HumanReview, VideoCategory } from "./benchmark.js";

export interface AutomatedClipEval {
  clipId: string;
  videoId: string;
  category: VideoCategory;
  source: { durationSeconds: number; width: number; height: number };
  clip: { durationSeconds: number; rank: number; percentile: number };
  pipeline: {
    candidateCount: number; selectedCount: number; duplicateCount: number;
    renderTimeMs: number; totalTimeMs: number; renderSuccess: boolean;
    validationStatus: "VALIDATED" | "DEGRADED" | "FAILED"; retries: number;
  };
  creative: {
    overallEngagement: number; overallQuality: number; hookStrength: number;
    narrativeCoherence: number; curiosityFactor: number; emotionalResonance: number;
    pacing: number; visualQuality: number; captionQuality: number;
    effectRelevance: number; editConsistency: number;
  };
  director: { confidence: number; effectCount: number; emphasisCount: number; style: string };
  resources: { outputSizeMB: number; peakMemoryMB?: number };
  detectedFailures: FailureCode[];
  humanReviews: HumanReview[];
  createdAt: string;
}

export interface BenchmarkReport {
  summary: {
    totalVideos: number;
    totalClips: number;
    categories: Record<string, { videos: number; clips: number }>;
    renderSuccessRate: number;
    validationSuccessRate: number;
    avgRenderTimeMs: number;
    avgTotalTimeMs: number;
    totalOutputMB: number;
    avgConfidence: number;
    avgEngagement: number;
    avgQuality: number;
  };
  byCategory: Record<string, {
    clipCount: number;
    avgEngagement: number;
    avgQuality: number;
    avgRenderTimeMs: number;
    renderSuccessRate: number;
  }>;
  failureDistribution: Record<FailureCode, number>;
  humanEvaluation?: {
    reviewCount: number;
    avgRatings: Record<string, number>;
    usabilityDistribution: number[];
  };
  evals: AutomatedClipEval[];
}

/** Generate a benchmark report from clip evaluations. */
export function generateBenchmarkReport(evals: AutomatedClipEval[]): BenchmarkReport {
  const n = evals.length || 1;

  const byCategory: Record<string, { clipCount: number; avgEngagement: number; avgQuality: number; avgRenderTimeMs: number; renderSuccessRate: number }> = {};
  for (const e of evals) {
    if (!byCategory[e.category]) byCategory[e.category] = { clipCount: 0, avgEngagement: 0, avgQuality: 0, avgRenderTimeMs: 0, renderSuccessRate: 0 };
    const cat = byCategory[e.category]!;
    cat.clipCount++;
    cat.avgEngagement += e.creative.overallEngagement;
    cat.avgQuality += e.creative.overallQuality;
    cat.avgRenderTimeMs += e.pipeline.renderTimeMs;
    cat.renderSuccessRate += e.pipeline.renderSuccess ? 1 : 0;
  }
  for (const c of Object.values(byCategory)) {
    c.avgEngagement = Math.round(c.avgEngagement / c.clipCount);
    c.avgQuality = Math.round(c.avgQuality / c.clipCount);
    c.avgRenderTimeMs = Math.round(c.avgRenderTimeMs / c.clipCount);
    c.renderSuccessRate = Math.round((c.renderSuccessRate / c.clipCount) * 100);
  }

  const failures: Record<string, number> = {};
  for (const e of evals) for (const f of e.detectedFailures) failures[f] = (failures[f] ?? 0) + 1;

  const categories: Record<string, { videos: number; clips: number }> = {};
  const videoSet = new Set<string>();
  for (const e of evals) {
    videoSet.add(e.videoId);
    if (!categories[e.category]) categories[e.category] = { videos: 0, clips: 0 };
    const cat = categories[e.category]!;
    cat.clips++;
  }
  for (const e of evals) {
    if (videoSet.has(e.videoId) && categories[e.category]) {
      categories[e.category]!.videos++;
    }
  }

  return {
    summary: {
      totalVideos: videoSet.size, totalClips: evals.length, categories,
      renderSuccessRate: Math.round((evals.filter((e) => e.pipeline.renderSuccess).length / n) * 100),
      validationSuccessRate: Math.round((evals.filter((e) => e.pipeline.validationStatus === "VALIDATED").length / n) * 100),
      avgRenderTimeMs: Math.round(evals.reduce((a, e) => a + e.pipeline.renderTimeMs, 0) / n),
      avgTotalTimeMs: Math.round(evals.reduce((a, e) => a + e.pipeline.totalTimeMs, 0) / n),
      totalOutputMB: Math.round(evals.reduce((a, e) => a + e.resources.outputSizeMB, 0) * 100) / 100,
      avgConfidence: Math.round(evals.reduce((a, e) => a + e.director.confidence, 0) / n),
      avgEngagement: Math.round(evals.reduce((a, e) => a + e.creative.overallEngagement, 0) / n),
      avgQuality: Math.round(evals.reduce((a, e) => a + e.creative.overallQuality, 0) / n),
    },
    byCategory,
    failureDistribution: failures as Record<FailureCode, number>,
    evals,
  };
}
