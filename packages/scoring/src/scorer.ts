import type { ScoreDimensions, ScoreBreakdown, ScoreDimensionKey, DEFAULT_SCORE_WEIGHTS } from "@clipforge/types";

/**
 * Pure scorer: takes pre-extracted signals, returns weighted ScoreBreakdown.
 * No I/O — fully testable.
 */
export function weightedScore(
  dims: ScoreDimensions,
  weights?: Record<ScoreDimensionKey, number>,
): ScoreBreakdown {
  const w = weights ?? { hook: 0.20, emotion: 0.15, novelty: 0.15, information: 0.15, curiosity: 0.10, payoff: 0.15, coherence: 0.10 };
  const keys: ScoreDimensionKey[] = ["hook", "emotion", "novelty", "information", "curiosity", "payoff", "coherence"];
  let total = 0;
  let weightSum = 0;
  for (const k of keys) {
    total += dims[k] * w[k]!;
    weightSum += w[k]!;
  }
  const overall = weightSum > 0 ? Math.round((total / weightSum) * 10) / 10 : 0;
  return { dimensions: dims, weights: w, overall: Math.min(100, Math.max(0, overall)), reasons: [], scorer: "weighted" };
}
