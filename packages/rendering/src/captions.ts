import type { TranscriptSegment } from "@clipforge/types";
import type { AssCue } from "@clipforge/ffmpeg";
import { computeTimeMapping, computeSilenceRemoval } from "./silence-map.js";
import type { PausePolicy } from "@clipforge/types";

export interface CaptionInput {
  segments: TranscriptSegment[];
  clipStart: number;
  clipEnd: number;
  pausePolicy: PausePolicy;
}

/**
 * Generate ASS caption cues for a clip, remapped through the time mapping
 * so captions align correctly after silence removal.
 */
export function generateCaptions(input: CaptionInput): AssCue[] {
  const silences = computeSilenceRemoval(input.segments, input.clipStart, input.clipEnd, input.pausePolicy);
  const mapping = computeTimeMapping(input.clipStart, input.clipEnd, silences);

  const clipSegs = input.segments
    .filter((s) => s.end > input.clipStart - 0.5 && s.start < input.clipEnd + 0.5)
    .sort((a, b) => a.start - b.start);

  return clipSegs.map((seg, i) => {
    const start = mapTime(Math.max(seg.start, input.clipStart), mapping);
    const end = mapTime(Math.min(seg.end, input.clipEnd), mapping);
    return {
      index: i,
      start: Math.max(0, start),
      end: Math.min(mapping.timelineDuration, end),
      text: seg.text,
      words: seg.words?.map((w) => ({
        text: w.text,
        start: mapTime(w.start, mapping),
        end: mapTime(w.end, mapping),
      })),
      speaker: seg.speaker ?? null,
    };
  }).filter((c) => c.end > c.start);
}

function mapTime(sourceTime: number, mapping: ReturnType<typeof computeTimeMapping>): number {
  for (const span of mapping.spans) {
    if (sourceTime >= span.sourceStart && sourceTime <= span.sourceEnd) {
      return span.timelineStart + (sourceTime - span.sourceStart);
    }
  }
  if (mapping.spans.length === 0) return sourceTime;
  return mapping.spans[mapping.spans.length - 1]!.timelineEnd;
}
