import { z } from "zod";

/**
 * Internal ranking signals. These are NOT claims about future view counts -
 * they model *engagement potential* dimensions used to rank candidates.
 * Each value is 0..100.
 */
export interface ScoreDimensions {
  hook: number;
  emotion: number;
  novelty: number;
  information: number;
  curiosity: number;
  payoff: number;
  coherence: number;
}

export const scoreDimensionKeys = [
  "hook",
  "emotion",
  "novelty",
  "information",
  "curiosity",
  "payoff",
  "coherence",
] as const;

export type ScoreDimensionKey = (typeof scoreDimensionKeys)[number];

export const DEFAULT_SCORE_WEIGHTS: Record<ScoreDimensionKey, number> = {
  hook: 0.2,
  emotion: 0.15,
  novelty: 0.15,
  information: 0.15,
  curiosity: 0.1,
  payoff: 0.15,
  coherence: 0.1,
};

export const scoreDimensionsSchema = z.object({
  hook: z.number().min(0).max(100),
  emotion: z.number().min(0).max(100),
  novelty: z.number().min(0).max(100),
  information: z.number().min(0).max(100),
  curiosity: z.number().min(0).max(100),
  payoff: z.number().min(0).max(100),
  coherence: z.number().min(0).max(100),
});

export interface ScoreBreakdown {
  dimensions: ScoreDimensions;
  weights: Record<ScoreDimensionKey, number>;
  /** Weighted total, 0..100, rounded to 1 decimal. */
  overall: number;
  /** Human-readable reasons ("strong statement", "clear payoff", ...). */
  reasons: string[];
  /** Which scorer produced this: "heuristic-v1" | "llm" | "hybrid". */
  scorer: string;
}

export const scoreBreakdownSchema = z.object({
  dimensions: scoreDimensionsSchema,
  weights: z.record(z.number()),
  overall: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  scorer: z.string(),
});
