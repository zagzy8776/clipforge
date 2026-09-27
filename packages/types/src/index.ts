/**
 * ClipForge engine contracts.
 *
 * Design rule: every AI dependency is expressed as an interface here so the
 * engine never hard-codes a vendor. Implementations live in `@clipforge/ai`.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* 1. Media / probe                                                           */
/* -------------------------------------------------------------------------- */

export interface MediaProbe {
  path: string;
  /** Source duration in seconds (container duration). */
  duration: number;
  width: number;
  height: number;
  /** Frames per second, source. */
  fps: number;
  /** Video codec name, e.g. "h264". */
  videoCodec: string;
  audioCodec: string | null;
  hasAudio: boolean;
  audioSampleRate: number | null;
  audioChannels: number | null;
  /** Estimated bitrate in bits/sec, when reported. */
  bitrate: number | null;
  sizeBytes: number;
  /** Format name as reported by ffprobe, kept for provenance. */
  formatName: string;
}

export const mediaProbeSchema = z.object({
  path: z.string(),
  duration: z.number().nonnegative(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  fps: z.number().nonnegative(),
  videoCodec: z.string(),
  audioCodec: z.string().nullable(),
  hasAudio: z.boolean(),
  audioSampleRate: z.number().int().nullable(),
  audioChannels: z.number().int().nullable(),
  bitrate: z.number().nonnegative().nullable(),
  sizeBytes: z.number().nonnegative(),
  formatName: z.string(),
});

/* -------------------------------------------------------------------------- */
/* 2. Transcript                                                              */
/* -------------------------------------------------------------------------- */

/** A word with precise timings. Optional: energy-VAD fallback yields none. */
export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
}

/** A timestamped speech segment. The atomic unit of analysis. */
export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: TranscriptWord[];
  speaker?: string | null;
}

export const transcriptWordSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
});

export const transcriptSegmentSchema = z.object({
  id: z.number().int().nonnegative(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
  words: z.array(transcriptWordSchema).optional(),
  speaker: z.string().nullable().optional(),
});

/** A run of consecutive segments forming a coherent paragraph. */
export interface TranscriptParagraph {
  id: number;
  start: number;
  end: number;
  text: string;
  segmentIds: number[];
  speaker: string | null;
}

export const transcriptParagraphSchema = z.object({
  id: z.number().int().nonnegative(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
  segmentIds: z.array(z.number().int().nonnegative()),
  speaker: z.string().nullable(),
});

/** A larger thematic unit of the video (a "chapter"). */
export interface TranscriptSection {
  id: string;
  index: number;
  start: number;
  end: number;
  title: string;
  summary: string;
  topics: string[];
  paragraphIds: number[];
}

export const transcriptSectionSchema = z.object({
  id: z.string(),
  index: z.number().int().nonnegative(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  title: z.string(),
  summary: z.string(),
  topics: z.array(z.string()),
  paragraphIds: z.array(z.number().int().nonnegative()),
});

export interface Transcript {
  language: string;
  /** Model/provider provenance, e.g. provider "energy-vad". */
  provider: string;
  model: string;
  duration: number;
  segments: TranscriptSegment[];
  paragraphs: TranscriptParagraph[];
  sections: TranscriptSection[];
  /** Full plain text, segments joined by spaces. */
  text: string;
  createdAt: string;
}

export const transcriptSchema = z.object({
  language: z.string(),
  provider: z.string(),
  model: z.string(),
  duration: z.number().nonnegative(),
  segments: z.array(transcriptSegmentSchema),
  paragraphs: z.array(transcriptParagraphSchema),
  sections: z.array(transcriptSectionSchema),
  text: z.string(),
  createdAt: z.string(),
});
