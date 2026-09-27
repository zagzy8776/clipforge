import { z } from "zod";
import {
  aspectRatioSchema,
  captionStyleNameSchema,
  clipModeSchema,
  pausePolicySchema,
  reframeModeSchema,
  type AspectRatio,
  type CaptionStyleName,
  type ClipMode,
  type PausePolicy,
  type ReframeMode,
} from "./editing.js";
import { scoreBreakdownSchema, type ScoreBreakdown } from "./scoring.js";

/* -------------------------------------------------------------------------- */
/* Edit plan                                                                  */
/* -------------------------------------------------------------------------- */

/** A contiguous source range that survived the dead-air cut. */
export interface TimeMappingSpan {
  sourceStart: number;
  sourceEnd: number;
  timelineStart: number;
  timelineEnd: number;
}

export interface TimeMapping {
  spans: TimeMappingSpan[];
  sourceDuration: number;
  timelineDuration: number;
}

export const timeMappingSchema: z.ZodType<TimeMapping> = z.object({
  spans: z.array(
    z.object({
      sourceStart: z.number(),
      sourceEnd: z.number(),
      timelineStart: z.number(),
      timelineEnd: z.number(),
    }),
  ),
  sourceDuration: z.number().positive(),
  timelineDuration: z.number().positive(),
});

export interface ClipMetadata {
  title: string;
  hook: string;
  description: string;
  hashtags: string[];
  /** Alternative hooks for A/B testing. */
  alternativeHooks: string[];
  suggestedPlatforms: string[];
}

export const clipMetadataSchema = z.object({
  title: z.string(),
  hook: z.string(),
  description: z.string(),
  hashtags: z.array(z.string()),
  alternativeHooks: z.array(z.string()),
  suggestedPlatforms: z.array(z.string()),
});

/**
 * One clip's full editing plan. The renderer consumes only this object, which
 * is what makes modes (podcast / hype / amv / ...) pluggable: a new mode is a
 * new plan producer, not a new renderer.
 */
export interface ClipPlan {
  clipId: string;
  index: number;
  projectId: string;
  candidateId: string;
  sourceStart: number;
  sourceEnd: number;
  clipDuration: number;
  aspectRatio: AspectRatio;
  mode: ClipMode;
  captionStyle: CaptionStyleName;
  reframe: ReframeMode;
  pausePolicy: PausePolicy;
  score: ScoreBreakdown;
  metadata: ClipMetadata;
  /** Ranges cut out of the source clip (dead air). */
  removedRanges: Array<{ start: number; end: number; duration: number }>;
  timeMapping: TimeMapping;
  segmentText: string;
}

export const clipPlanSchema: z.ZodType<ClipPlan> = z.object({
  clipId: z.string(),
  index: z.number().int().nonnegative(),
  projectId: z.string(),
  candidateId: z.string(),
  sourceStart: z.number().nonnegative(),
  sourceEnd: z.number().positive(),
  clipDuration: z.number().positive(),
  aspectRatio: aspectRatioSchema,
  mode: clipModeSchema,
  captionStyle: captionStyleNameSchema,
  reframe: reframeModeSchema,
  pausePolicy: pausePolicySchema,
  score: scoreBreakdownSchema,
  metadata: clipMetadataSchema,
  removedRanges: z.array(
    z.object({ start: z.number(), end: z.number(), duration: z.number() }),
  ),
  timeMapping: timeMappingSchema,
  segmentText: z.string(),
});
