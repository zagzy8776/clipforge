import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Aspect ratio + modes                                                       */
/* -------------------------------------------------------------------------- */

export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9";

export const aspectRatioSchema = z.enum(["9:16", "1:1", "4:5", "16:9"]);

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export type ClipMode =
  | "podcast"
  | "educational"
  | "hype"
  | "cinematic"
  | "meme"
  | "amv"
  | "custom";

export const clipModeSchema = z.enum([
  "podcast",
  "educational",
  "hype",
  "cinematic",
  "meme",
  "amv",
  "custom",
]);

export type CaptionStyleName = "modern" | "dynamic" | "bold" | "minimal" | "karaoke";

export const captionStyleNameSchema = z.enum(["modern", "dynamic", "bold", "minimal", "karaoke"]);

export type ReframeMode = "center-crop" | "face-track";

export const reframeModeSchema = z.enum(["center-crop", "face-track"]);

/** How to treat the pauses between transcript segments. */
export interface PausePolicy {
  /** Cut pauses longer than this (seconds). */
  cutPausesLongerThan: number;
  /** Always leave this much silence so speech does not sound clipped. */
  keepPause: number;
  /** Never cut a pause shorter than this even if above threshold. */
  minimumCut: number;
}

export const pausePolicySchema = z.object({
  cutPausesLongerThan: z.number().positive(),
  keepPause: z.number().nonnegative(),
  minimumCut: z.number().nonnegative(),
});

export const DEFAULT_PAUSE_POLICY: PausePolicy = {
  cutPausesLongerThan: 0.45,
  keepPause: 0.18,
  minimumCut: 0.12,
};

/* -------------------------------------------------------------------------- */
/* Captions                                                                   */
/* -------------------------------------------------------------------------- */

/** A caption cue rendered onto the final video (timeline seconds, post-cut). */
export interface CaptionCue {
  index: number;
  start: number;
  end: number;
  text: string;
  /** Per-word timings for karaoke-style highlighting. */
  words?: Array<{ text: string; start: number; end: number }>;
  speaker: string | null;
}

export const captionCueSchema = z.object({
  index: z.number().int().nonnegative(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
  words: z
    .array(z.object({ text: z.string(), start: z.number(), end: z.number() }))
    .optional(),
  speaker: z.string().nullable(),
});

export interface CaptionPreset {
  name: CaptionStyleName;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  highlightColor: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: number;
  marginVertical: number;
  marginHorizontal: number;
  uppercase: boolean;
  maxCharsPerLine: number;
  maxLines: number;
  bold: boolean;
  /** block = full line at once; karaoke = highlight the active word. */
  reveal: "block" | "karaoke";
}
