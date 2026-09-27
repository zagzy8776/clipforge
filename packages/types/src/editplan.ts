import { z } from "zod";

export type EditStrategy = "center" | "speaker" | "face-track";
export type TransitionType = "cut" | "fade" | "zoom-in" | "zoom-out" | "dip-to-black";
export type EffectType = "punch-in" | "zoom-in" | "zoom-out" | "speed-ramp" | "glow" | "vignette";

export interface EditPlan {
  source: { start: number; end: number; };
  framing: {
    aspectRatio: "9:16" | "1:1" | "4:5" | "16:9";
    strategy: EditStrategy;
  };
  captions: {
    enabled: boolean;
    style: "modern" | "dynamic" | "bold" | "minimal" | "karaoke";
    position: "bottom" | "center" | "top";
  };
  audio: {
    normalize: boolean;
    removeSilence: boolean;
    silenceThreshold: number;
    keepPause: number;
    music?: string;
    musicVolume?: number;
    syncToBeat?: boolean;
  };
  effects: EditEffect[];
  transitions: EditTransition[];
  branding: {
    watermark?: string;
    watermarkPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
  metadata: {
    title: string;
    hook: string;
    description: string;
    hashtags: string[];
    platforms: string[];
  };
}

export interface EditEffect {
  type: EffectType;
  at: number;
  duration: number;
  intensity?: number;
}

export interface EditTransition {
  type: TransitionType;
  at: number;
  duration: number;
}

/* ---------- Zod schemas for validation ---------- */

export const editEffectSchema = z.object({
  type: z.enum(["punch-in", "zoom-in", "zoom-out", "speed-ramp", "glow", "vignette"]),
  at: z.number().nonnegative(),
  duration: z.number().positive(),
  intensity: z.number().min(0).max(1).optional(),
});

export const editTransitionSchema = z.object({
  type: z.enum(["cut", "fade", "zoom-in", "zoom-out", "dip-to-black"]),
  at: z.number().nonnegative(),
  duration: z.number().positive(),
});

export const editPlanSchema = z.object({
  source: z.object({ start: z.number().nonnegative(), end: z.number().positive() }),
  framing: z.object({
    aspectRatio: z.enum(["9:16", "1:1", "4:5", "16:9"]),
    strategy: z.enum(["center", "speaker", "face-track"]),
  }),
  captions: z.object({
    enabled: z.boolean(),
    style: z.enum(["modern", "dynamic", "bold", "minimal", "karaoke"]),
    position: z.enum(["bottom", "center", "top"]),
  }),
  audio: z.object({
    normalize: z.boolean(),
    removeSilence: z.boolean(),
    silenceThreshold: z.number(),
    keepPause: z.number(),
    music: z.string().optional(),
    musicVolume: z.number().optional(),
    syncToBeat: z.boolean().optional(),
  }),
  effects: z.array(editEffectSchema),
  transitions: z.array(editTransitionSchema),
  branding: z.object({
    watermark: z.string().optional(),
    watermarkPosition: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).optional(),
  }),
  metadata: z.object({
    title: z.string(),
    hook: z.string(),
    description: z.string(),
    hashtags: z.array(z.string()),
    platforms: z.array(z.string()),
  }),
});
