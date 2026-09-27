import type { CandidateMoment, TranscriptSegment, EngineConfig } from "@clipforge/types";
import type { RenderPlan } from "@clipforge/ffmpeg";
import type { AssCue } from "@clipforge/ffmpeg";
import { probe } from "@clipforge/ffmpeg";
import { computeTimeMapping, computeSilenceRemoval } from "./silence-map.js";

export interface PlanInput {
  candidate: CandidateMoment;
  segments: TranscriptSegment[];
  config: EngineConfig;
  sourcePath: string;
  outputDir: string;
}

/**
 * Build a complete RenderPlan for a single candidate clip.
 * Handles: trim, silence removal, 9:16 reframe, caption embedding.
 */
export function buildRenderPlan(input: PlanInput): RenderPlan & { captions: AssCue[] } {
  const { candidate, config, sourcePath, outputDir } = input;

  // Compute silence removal for this clip range
  const silences = computeSilenceRemoval(
    input.segments,
    candidate.start,
    candidate.end,
    config.pausePolicy,
  );

  // Compute time mapping (for caption remapping)
  const mapping = computeTimeMapping(candidate.start, candidate.end, silences);

  // Build caption cues mapped to timeline time
  const captions = input.segments
    .filter((s) => s.start >= candidate.start - 0.5 && s.end <= candidate.end + 0.5)
    .map((s, i) => ({
      index: i,
      start: sourceToTimeline(s.start, mapping),
      end: sourceToTimeline(s.end, mapping),
      text: s.text,
      words: s.words?.map((w) => ({
        text: w.text,
        start: sourceToTimeline(w.start, mapping),
        end: sourceToTimeline(w.end, mapping),
      })),
      speaker: s.speaker ?? null,
    }));

  const clipPath = `${outputDir}/clip-${String(candidate.index + 1).padStart(2, "0")}.mp4`;
  const thumbPath = `${outputDir}/clip-${String(candidate.index + 1).padStart(2, "0")}.jpg`;

  const probeResult = probe(input.sourcePath);

  return {
    sourcePath,
    sourceWidth: probeResult.width,
    sourceHeight: probeResult.height,
    outputPath: clipPath,
    thumbnailPath: thumbPath,
    width: config.render.width,
    height: config.render.height,
    fps: config.render.fps,
    trimStart: candidate.start,
    trimEnd: candidate.end,
    silenceSpans: silences,
    captions,
    captionStyle: config.captionStyle,
    crf: config.render.crf,
    preset: config.render.preset,
    audioBitrate: config.render.audioBitrate,
    videoCodec: config.render.videoCodec,
    backgroundColor: config.render.background,
    thumbnailTimeOffset: 0.5,
  };
}

function sourceToTimeline(sourceTime: number, mapping: TimeMapping): number {
  for (const span of mapping.spans) {
    if (sourceTime >= span.sourceStart && sourceTime <= span.sourceEnd) {
      return span.timelineStart + (sourceTime - span.sourceStart);
    }
  }
  // If outside all spans, clamp to nearest
  if (mapping.spans.length === 0) return sourceTime;
  const last = mapping.spans[mapping.spans.length - 1]!;
  return last.timelineEnd;
}

import type { TimeMapping } from "./silence-map.js";
