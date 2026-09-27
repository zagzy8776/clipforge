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
import { renderSettingsSchema, thumbnailSettingsSchema, type RenderSettings, type ThumbnailSettings } from "./render-settings.js";

export interface PreviewSettings {
  enabled: boolean;
  maxSeconds: number;
  scale: number;
}

export const previewSettingsSchema = z.object({
  enabled: z.boolean(),
  maxSeconds: z.number().positive(),
  scale: z.number().positive().max(1),
});

export interface EngineConfig {
  projectId: string;
  outputDir: string;
  /** How many clips to deliver. */
  targetClips: number;
  /** Hard bounds for a clip, seconds. */
  minClipDuration: number;
  maxClipDuration: number;
  /** Preferred window when mining candidates. */
  preferredClipDuration: number;
  /** Candidate mining stride, seconds (how dense the candidate grid is). */
  candidateStride: number;
  aspectRatio: AspectRatio;
  mode: ClipMode;
  captionStyle: CaptionStyleName;
  reframe: ReframeMode;
  pausePolicy: PausePolicy;
  weights: Record<string, number>;
  transcription: {
    provider: string;
    model: string;
    language: string | null;
    /** 0..100, candidates below this are dropped before ranking. */
    minimumScore: number;
    /** 0..1 semantic similarity above which two candidates are duplicates. */
    duplicateThreshold: number;
    /** Which LLM model the analysis stages used (provenance). */
    analysisModel: string;
  };
  render: RenderSettings;
  thumbnail: ThumbnailSettings;
  preview: PreviewSettings;
  keepIntermediate: boolean;
  captionsEnabled: boolean;
  concurrency: number;
  seed: number;
}

export const engineConfigSchema: z.ZodType<EngineConfig> = z.object({
  projectId: z.string().min(1),
  outputDir: z.string().min(1),
  targetClips: z.number().int().positive(),
  minClipDuration: z.number().positive(),
  maxClipDuration: z.number().positive(),
  preferredClipDuration: z.number().positive(),
  candidateStride: z.number().positive(),
  aspectRatio: aspectRatioSchema,
  mode: clipModeSchema,
  captionStyle: captionStyleNameSchema,
  reframe: reframeModeSchema,
  pausePolicy: pausePolicySchema,
  weights: z.record(z.number()),
  transcription: z.object({
    provider: z.string(),
    model: z.string(),
    language: z.string().nullable(),
    minimumScore: z.number().min(0).max(100),
    duplicateThreshold: z.number().min(0).max(1),
    analysisModel: z.string(),
  }),
  render: renderSettingsSchema,
  thumbnail: thumbnailSettingsSchema,
  preview: previewSettingsSchema,
  keepIntermediate: z.boolean(),
  captionsEnabled: z.boolean(),
  concurrency: z.number().int().positive(),
  seed: z.number().int(),
});
