import { z } from "zod";

/**
 * DirectorPlan — the AI's complete creative decision for a clip.
 *
 * This is the bridge between "what the AI decided" and "how to render it."
 * The Director produces this plan; the renderer executes it; the evaluator
 * judges whether the decisions were good.
 */

export type PacingStyle = "fast" | "natural" | "slow" | "dramatic";
export type VisualStyle = "clean" | "dramatic" | "energetic" | "minimal" | "text-heavy";
export type MusicStrategy = "none" | "ambient" | "beat-sync" | "emotional-arc" | "energy-build";
export type CaptionStrategy = "standard" | "dynamic" | "word-emphasis" | "punchline-focus" | "none";
export type TransitionStyle = "cut" | "fade" | "cross-dissolve" | "dip-to-black" | "whip-pan";

export interface DirectorPlan {
  /** The hook that opens the clip. */
  hook: string;

  /** How the clip should feel in terms of pacing. */
  pacing: PacingStyle;

  /** Visual style governing the overall look. */
  visualStyle: VisualStyle;

  /** Music strategy for the clip. */
  musicStrategy: MusicStrategy;

  /** How captions should be rendered. */
  captionStrategy: CaptionStrategy;

  /** Framing strategy. */
  framingStrategy: "center" | "speaker" | "face-track" | "dynamic-zoom";

  /** Effects to apply, with precise timing. */
  effects: DirectorEffect[];

  /** Transitions at specific moments. */
  transitions: DirectorTransition[];

  /** Key moments where emphasis should be applied. */
  emphasisMoments: EmphasisMoment[];

  /** Overall creative reasoning — why these decisions were made. */
  reasoning: string;

  /** Confidence score 0-100 for the overall plan quality. */
  confidence: number;
}

export interface DirectorEffect {
  type: "punch-in" | "zoom-in" | "zoom-out" | "speed-ramp" | "vignette" | "glow" | "letterbox";
  /** When to apply (seconds from clip start). */
  at: number;
  /** Duration in seconds. */
  duration: number;
  /** Intensity 0-1. */
  intensity: number;
  /** Why this effect was chosen. */
  reason: string;
}

export interface DirectorTransition {
  type: TransitionStyle;
  /** When to apply (seconds from clip start). */
  at: number;
  /** Duration in seconds. */
  duration: number;
}

export interface EmphasisMoment {
  /** Timestamp in seconds from clip start. */
  time: number;
  /** What word or phrase to emphasize. */
  text: string;
  /** How to emphasize: "size" (bigger), "color" (different color), "bold" (weight), "speed" (slower reveal). */
  emphasisType: "size" | "color" | "bold" | "speed" | "animation";
  /** Duration of emphasis effect. */
  duration: number;
}

/* ---------- Zod schemas ---------- */

export const directorEffectSchema = z.object({
  type: z.enum(["punch-in", "zoom-in", "zoom-out", "speed-ramp", "vignette", "glow", "letterbox"]),
  at: z.number().nonnegative(),
  duration: z.number().positive(),
  intensity: z.number().min(0).max(1),
  reason: z.string(),
});

export const directorTransitionSchema = z.object({
  type: z.enum(["cut", "fade", "cross-dissolve", "dip-to-black", "whip-pan"]),
  at: z.number().nonnegative(),
  duration: z.number().positive(),
});

export const emphasisMomentSchema = z.object({
  time: z.number().nonnegative(),
  text: z.string(),
  emphasisType: z.enum(["size", "color", "bold", "speed", "animation"]),
  duration: z.number().positive(),
});

export const directorPlanSchema = z.object({
  hook: z.string().min(1),
  pacing: z.enum(["fast", "natural", "slow", "dramatic"]),
  visualStyle: z.enum(["clean", "dramatic", "energetic", "minimal", "text-heavy"]),
  musicStrategy: z.enum(["none", "ambient", "beat-sync", "emotional-arc", "energy-build"]),
  captionStrategy: z.enum(["standard", "dynamic", "word-emphasis", "punchline-focus", "none"]),
  framingStrategy: z.enum(["center", "speaker", "face-track", "dynamic-zoom"]),
  effects: z.array(directorEffectSchema),
  transitions: z.array(directorTransitionSchema),
  emphasisMoments: z.array(emphasisMomentSchema),
  reasoning: z.string().min(1),
  confidence: z.number().min(0).max(100),
});
