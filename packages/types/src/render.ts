import { z } from "zod";
import { renderArtifactSchema, type RenderArtifact } from "./render-artifact.js";

export * from "./render-artifact.js";

export interface RenderManifest {
  schemaVersion: string;
  projectId: string;
  renderedAt: string;
  outputDir: string;
  provider: string;
  clipCount: number;
  successCount: number;
  failureCount: number;
  totalRenderMs: number;
  clips: RenderArtifact[];
}

export const renderManifestSchema: z.ZodType<RenderManifest> = z.object({
  schemaVersion: z.string(),
  projectId: z.string(),
  renderedAt: z.string(),
  outputDir: z.string(),
  provider: z.string(),
  clipCount: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  totalRenderMs: z.number().nonnegative(),
  clips: z.array(renderArtifactSchema),
});
