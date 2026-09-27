import { z } from "zod";

export type RenderStatus = "pending" | "rendering" | "completed" | "failed";

export interface RenderArtifact {
  clipId: string;
  index: number;
  status: RenderStatus;
  videoPath: string | null;
  thumbnailPath: string | null;
  captionPath: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  fps: number | null;
  error: string | null;
  attempts: number;
  renderMs: number | null;
}

export const renderArtifactSchema: z.ZodType<RenderArtifact> = z.object({
  clipId: z.string(),
  index: z.number().int().nonnegative(),
  status: z.enum(["pending", "rendering", "completed", "failed"]),
  videoPath: z.string().nullable(),
  thumbnailPath: z.string().nullable(),
  captionPath: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  sizeBytes: z.number().nullable(),
  fps: z.number().nullable(),
  error: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  renderMs: z.number().nullable(),
});
