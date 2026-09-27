import { z } from "zod";
import { clipPlanSchema, type ClipPlan } from "./plan.js";
import { candidateMomentSchema, droppedCandidateSchema, type CandidateMoment, type DroppedCandidate } from "./candidates.js";
import { transcriptSchema, type Transcript } from "./index.js";
import { mediaProbeSchema, type MediaProbe } from "./index.js";
import { engineConfigSchema, type EngineConfig } from "./engine-config.js";
import { renderManifestSchema, type RenderManifest } from "./render.js";

export * from "./index.js";
export * from "./scoring.js";
export * from "./candidates.js";
export * from "./editing.js";
export * from "./plan.js";
export * from "./render-settings.js";
export * from "./render.js";
export * from "./engine-config.js";
export * from "./progress.js";
export * from "./editplan.js";
export * from "./editing-styles.js";
export * from "./director-plan.js";
export * from "./creative-profile.js";
export * from "./creative-evaluation.js";

/* -------------------------------------------------------------------------- */
/* Analysis document                                                          */
/* -------------------------------------------------------------------------- */

export const ANALYSIS_SCHEMA_VERSION = "1.0.0" as const;

export interface AnalysisWarning {
  code: string;
  message: string;
  stage: string;
}

export const analysisWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  stage: z.string(),
});

export type ProjectStatus =
  | "CREATED"
  | "INGESTING"
  | "TRANSCRIBING"
  | "ANALYZING"
  | "SELECTING"
  | "RENDERING"
  | "COMPLETED"
  | "FAILED";

export interface AnalysisStats {
  durationSeconds: number;
  segmentCount: number;
  paragraphCount: number;
  sectionCount: number;
  candidateCount: number;
  duplicateCount: number;
  selectedCount: number;
  /** Wall-clock milliseconds per stage. */
  timings: Record<string, number>;
}

export const analysisStatsSchema: z.ZodType<AnalysisStats> = z.object({
  durationSeconds: z.number().nonnegative(),
  segmentCount: z.number().int().nonnegative(),
  paragraphCount: z.number().int().nonnegative(),
  sectionCount: z.number().int().nonnegative(),
  candidateCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  selectedCount: z.number().int().nonnegative(),
  timings: z.record(z.number()),
});

export interface AnalysisResult {
  schemaVersion: string;
  engine: { name: string; version: string };
  projectId: string;
  status: ProjectStatus;
  createdAt: string;
  source: {
    path: string;
    fileName: string;
    duration: number;
    width: number;
    height: number;
    fps: number;
    hasAudio: boolean;
    probe: MediaProbe;
  };
  config: EngineConfig;
  providers: {
    transcription: string;
    analysis: string;
    scoring: string;
  };
  transcript: Transcript;
  /** Every candidate the moment engine produced, scored, kept or not. */
  candidates: CandidateMoment[];
  /** Ranked selection, ready to render. */
  clips: ClipPlan[];
  droppedCandidates: DroppedCandidate[];
  stats: AnalysisStats;
  warnings: AnalysisWarning[];
}

export const analysisResultSchema: z.ZodType<AnalysisResult> = z.object({
  schemaVersion: z.string(),
  engine: z.object({ name: z.string(), version: z.string() }),
  projectId: z.string(),
  status: z.enum([
    "CREATED",
    "INGESTING",
    "TRANSCRIBING",
    "ANALYZING",
    "SELECTING",
    "RENDERING",
    "COMPLETED",
    "FAILED",
  ]),
  createdAt: z.string(),
  source: z.object({
    path: z.string(),
    fileName: z.string(),
    duration: z.number(),
    width: z.number(),
    height: z.number(),
    fps: z.number(),
    hasAudio: z.boolean(),
    probe: mediaProbeSchema,
  }),
  config: engineConfigSchema,
  providers: z.object({
    transcription: z.string(),
    analysis: z.string(),
    scoring: z.string(),
  }),
  transcript: transcriptSchema,
  candidates: z.array(candidateMomentSchema),
  clips: z.array(clipPlanSchema),
  droppedCandidates: z.array(droppedCandidateSchema),
  stats: analysisStatsSchema,
  warnings: z.array(analysisWarningSchema),
});

/** Candidates-only artifact (cheap hand-off between analyze and render). */
export interface CandidatesDocument {
  schemaVersion: string;
  projectId: string;
  createdAt: string;
  targetClips: number;
  candidates: CandidateMoment[];
  dropped: DroppedCandidate[];
}

export const candidatesDocumentSchema: z.ZodType<CandidatesDocument> = z.object({
  schemaVersion: z.string(),
  projectId: z.string(),
  createdAt: z.string(),
  targetClips: z.number().int().positive(),
  candidates: z.array(candidateMomentSchema),
  dropped: z.array(droppedCandidateSchema),
});

export type { AnalysisResult as AnalysisDocument, RenderManifest };
export { renderManifestSchema };
