import { z } from "zod";

export interface RenderSettings {
  /** ffmpeg executable path; resolved by @clipforge/ffmpeg by default. */
  path: string;
  width: number;
  height: number;
  fps: number;
  videoBitrate: string;
  audioBitrate: string;
  preset: string;
  crf: number;
  pixelFormat: string;
  fastStart: boolean;
  audioSampleRate: number;
  colorRange: "limited" | "full";
  background: string;
  /** Video encoder name, e.g. libx264. */
  videoCodec: string;
}

export const renderSettingsSchema = z.object({
  path: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  videoBitrate: z.string(),
  audioBitrate: z.string(),
  preset: z.string(),
  crf: z.number(),
  pixelFormat: z.string(),
  fastStart: z.boolean(),
  audioSampleRate: z.number().int().positive(),
  colorRange: z.enum(["limited", "full"]),
  background: z.string(),
  videoCodec: z.string(),
});

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  path: "ffmpeg",
  width: 1080,
  height: 1920,
  fps: 30,
  videoBitrate: "0",
  audioBitrate: "192k",
  preset: "veryfast",
  crf: 21,
  pixelFormat: "yuv420p",
  fastStart: true,
  audioSampleRate: 48000,
  colorRange: "limited",
  background: "#000000",
  videoCodec: "libx264",
};

export interface ThumbnailSettings {
  /** Offset from clip start, seconds. */
  at: number;
  width: number;
  height: number;
  format: "jpg" | "png";
  quality: number;
}

export const thumbnailSettingsSchema = z.object({
  at: z.number().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.enum(["jpg", "png"]),
  quality: z.number().int().min(1).max(31),
});

export const DEFAULT_THUMBNAIL_SETTINGS: ThumbnailSettings = {
  at: 0.5,
  width: 1080,
  height: 1920,
  format: "jpg",
  quality: 3,
};
