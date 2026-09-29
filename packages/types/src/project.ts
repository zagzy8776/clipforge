import { z } from "zod";
import type { DirectorPlan } from "./director-plan.js";
import type { CandidateMoment } from "./candidates.js";
import type { CreativeEvaluation } from "./creative-evaluation.js";
import type { CreativeProfile } from "./creative-profile.js";

export type ProjectStatus = "created" | "ingesting" | "transcribing" | "analyzing" | "directing" | "rendering" | "completed" | "failed";

export interface Project {
  id: string;
  name: string;
  sourcePath: string;
  sourceUrl?: string;
  status: ProjectStatus;
  /** Arbitrary engine/ingest config persisted alongside the project (JSONB column). */
  config?: Record<string, unknown>;
  /** Transcript segments from Whisper. */
  segments: Array<{ id: number; start: number; end: number; text: string; words?: Array<{ text: string; start: number; end: number }> }>;
  /** AI-identified sections. */
  sections: Array<{ id: string; start: number; end: number; title: string; summary: string; topics: string[] }>;
  /** Candidate moments discovered. */
  candidates: CandidateMoment[];
  /** Rendered clips with DirectorPlans. */
  clips: ProjectClip[];
  /** Overall project statistics. */
  stats: ProjectStats;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectClip {
  id: string;
  index: number;
  /** Explicit DB ordering rank, when it differs from index. */
  rank?: number;
  /** Source timestamps. */
  sourceStart: number;
  sourceEnd: number;
  /** The DirectorPlan that created this clip. */
  directorPlan: DirectorPlan;
  /** Creative profile used. */
  profileName: string;
  /** Creative evaluation result. */
  evaluation?: CreativeEvaluation;
  /** File paths. */
  artifacts: {
    video?: string;
    thumbnail?: string;
    editPlan?: string;
    captions?: string;
  };
  /** Status. */
  status: "pending" | "rendering" | "rendered" | "validated" | "failed";
  /** Percentile rank among candidates. */
  percentile?: number;
  /** Raw score. */
  score: number;
  /** User edits / overrides. */
  userEdits?: Record<string, unknown>;
}

export interface ProjectStats {
  totalCandidates: number;
  selectedClips: number;
  validatedClips: number;
  avgEngagement: number;
  avgQuality: number;
  totalRenderTimeMs: number;
  totalSizeMB: number;
}

/* ---------- Timeline Model ---------- */

export interface Timeline {
  /** Total duration in seconds. */
  duration: number;
  /** Video frames per second. */
  fps: number;
  /** Tracks on the timeline. */
  tracks: TimelineTrack[];
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "caption" | "effect" | "transition" | "emphasis";
  items: TimelineItem[];
}

export interface TimelineItem {
  id: string;
  /** Start time in seconds on the timeline. */
  start: number;
  /** End time in seconds. */
  end: number;
  /** Item-specific data. */
  data: Record<string, unknown>;
  /** Visual color for the timeline. */
  color?: string;
}

/* ---------- Zod schemas ---------- */

export const projectClipSchema = z.object({
  id: z.string(),
  index: z.number(),
  sourceStart: z.number(),
  sourceEnd: z.number(),
  directorPlan: z.any(), // DirectorPlan is complex
  profileName: z.string(),
  evaluation: z.any().optional(),
  artifacts: z.object({
    video: z.string().optional(),
    thumbnail: z.string().optional(),
    editPlan: z.string().optional(),
    captions: z.string().optional(),
  }),
  status: z.enum(["pending", "rendering", "rendered", "validated", "failed"]),
  percentile: z.number().optional(),
  score: z.number(),
  userEdits: z.record(z.unknown()).optional(),
});
