import { z } from "zod";

/**
 * CreativeEvaluation — structured assessment of an AI-directed edit.
 *
 * Uses "Engagement Potential" and "Creative Quality" dimensions,
 * never "viral probability" or similar claims.
 */
export interface CreativeEvaluation {
  /** Engagement Potential — how likely this clip is to hold attention. */
  engagementPotential: {
    hookStrength: number;       // 0-100: does the opening grab?
    narrativeCoherence: number; // 0-100: is it self-contained?
    curiosityFactor: number;    // 0-100: does it make you want to watch?
    emotionalResonance: number; // 0-100: does it connect emotionally?
    informationDensity: number; // 0-100: is it content-rich?
  };

  /** Creative Quality — how well the edit was executed. */
  creativeQuality: {
    pacing: number;             // 0-100: does the rhythm feel right?
    visualQuality: number;      // 0-100: framing, crop, resolution
    captionQuality: number;     // 0-100: readable, well-timed, styled
    effectRelevance: number;    // 0-100: effects serve the content
    audioSync: number;          // 0-100: audio is clean and synced
    editConsistency: number;    // 0-100: decisions feel cohesive
  };

  /** What the evaluation found. */
  strengths: string[];
  issues: string[];

  /** Overall engagement potential (weighted average). */
  overallEngagement: number;

  /** Overall creative quality (weighted average). */
  overallQuality: number;

  /** Human review slot (optional). */
  humanReview?: {
    approved: boolean;
    notes?: string;
    reviewer?: string;
    reviewedAt?: string;
  };

  /** How the evaluation was produced. */
  method: "deterministic" | "llm" | "hybrid";
  confidence: number;
}

export const creativeEvaluationSchema = z.object({
  engagementPotential: z.object({
    hookStrength: z.number().min(0).max(100),
    narrativeCoherence: z.number().min(0).max(100),
    curiosityFactor: z.number().min(0).max(100),
    emotionalResonance: z.number().min(0).max(100),
    informationDensity: z.number().min(0).max(100),
  }),
  creativeQuality: z.object({
    pacing: z.number().min(0).max(100),
    visualQuality: z.number().min(0).max(100),
    captionQuality: z.number().min(0).max(100),
    effectRelevance: z.number().min(0).max(100),
    audioSync: z.number().min(0).max(100),
    editConsistency: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  issues: z.array(z.string()),
  overallEngagement: z.number().min(0).max(100),
  overallQuality: z.number().min(0).max(100),
  humanReview: z.object({
    approved: z.boolean(),
    notes: z.string().optional(),
    reviewer: z.string().optional(),
    reviewedAt: z.string().optional(),
  }).optional(),
  method: z.enum(["deterministic", "llm", "hybrid"]),
  confidence: z.number().min(0).max(100),
});
