import { z } from "zod";
import { scoreBreakdownSchema, type ScoreDimensionKey, type ScoreBreakdown } from "./scoring.js";

/* -------------------------------------------------------------------------- */
/* Candidates                                                                 */
/* -------------------------------------------------------------------------- */

export type CandidateBoundaryBasis =
  | "sentence"
  | "paragraph"
  | "silence"
  | "speaker-change"
  | "section"
  | "llm"
  | "fallback-window";

export const candidateBoundaryBasisSchema = z.enum([
  "sentence",
  "paragraph",
  "silence",
  "speaker-change",
  "section",
  "llm",
  "fallback-window",
]);

export interface CandidateMoment {
  id: string;
  /** Stable index within a run: candidate-01, candidate-02 ... */
  index: number;
  projectId: string;
  sectionId: string | null;
  start: number;
  end: number;
  duration: number;
  /** Exact transcript text inside the boundaries. */
  text: string;
  segmentIds: number[];
  paragraphIds: number[];
  boundaryBasis: { start: CandidateBoundaryBasis; end: CandidateBoundaryBasis };
  /** Short label used in logs / dashboard. */
  label: string;
  /** Where this candidate came from. */
  source: "heuristic" | "llm" | "merged";
  score: ScoreBreakdown;
  /** Set when the candidate lost duplicate detection. */
  duplicateOf?: string;
  /** 0..1 similarity to the kept candidate (duplicate detection). */
  duplicateSimilarity?: number;
  kept: boolean;
}

export const candidateMomentSchema: z.ZodType<CandidateMoment> = z.object({
  id: z.string(),
  index: z.number().int().nonnegative(),
  projectId: z.string(),
  sectionId: z.string().nullable(),
  start: z.number().nonnegative(),
  end: z.number().positive(),
  duration: z.number().positive(),
  text: z.string(),
  segmentIds: z.array(z.number().int().nonnegative()),
  paragraphIds: z.array(z.number().int().nonnegative()),
  boundaryBasis: z.object({
    start: candidateBoundaryBasisSchema,
    end: candidateBoundaryBasisSchema,
  }),
  label: z.string(),
  source: z.enum(["heuristic", "llm", "merged"]),
  score: scoreBreakdownSchema,
  duplicateOf: z.string().optional(),
  duplicateSimilarity: z.number().optional(),
  kept: z.boolean(),
});

export interface DroppedCandidate {
  candidateId: string;
  reason: "duplicate" | "below-threshold" | "out-of-duration" | "outside-source";
  detail: string;
}

export const droppedCandidateSchema = z.object({
  candidateId: z.string(),
  reason: z.enum(["duplicate", "below-threshold", "out-of-duration", "outside-source"]),
  detail: z.string(),
});

/** Aggregation over the 7 modelled dimensions. */
export type ScoreWeights = Record<ScoreDimensionKey, number>;
