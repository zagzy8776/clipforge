import type { TranscriptSegment } from "@clipforge/types";
import { DEFAULT_PAUSE_POLICY, type PausePolicy } from "@clipforge/types";

/**
 * Compute silence spans to remove within a clip's time range.
 * Returns spans in SOURCE time coordinates.
 */
export function computeSilenceRemoval(
  segments: TranscriptSegment[],
  clipStart: number,
  clipEnd: number,
  policy: PausePolicy = DEFAULT_PAUSE_POLICY,
): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  const clipSegs = segments
    .filter((s) => s.end > clipStart && s.start < clipEnd)
    .sort((a, b) => a.end - b.end);

  for (let i = 0; i < clipSegs.length - 1; i++) {
    const gapStart = clipSegs[i]!.end;
    const gapEnd = clipSegs[i + 1]!.start;
    const gapDur = gapEnd - gapStart;

    if (gapDur > policy.cutPausesLongerThan && gapDur > policy.minimumCut + policy.keepPause) {
      // Keep a natural pause, remove the excess
      const removeStart = gapStart + policy.keepPause;
      const removeEnd = gapEnd - policy.keepPause;
      if (removeEnd > removeStart && removeEnd - removeStart > policy.minimumCut) {
        spans.push({
          start: Math.max(clipStart, removeStart),
          end: Math.min(clipEnd, removeEnd),
        });
      }
    }
  }
  return spans;
}

/* -------------------------------------------------------------------------- */
/* Time mapping: source seconds → timeline seconds (post-silence-removal)     */
/* -------------------------------------------------------------------------- */

export interface TimeMapping {
  spans: Array<{
    sourceStart: number;
    sourceEnd: number;
    timelineStart: number;
    timelineEnd: number;
  }>;
  sourceDuration: number;
  timelineDuration: number;
}

export function computeTimeMapping(
  clipStart: number,
  clipEnd: number,
  silenceSpans: Array<{ start: number; end: number }>,
): TimeMapping {
  const sourceDuration = clipEnd - clipStart;
  const sorted = [...silenceSpans]
    .filter((s) => s.start >= clipStart && s.end <= clipEnd)
    .sort((a, b) => a.start - b.start);

  const spans: TimeMapping["spans"] = [];
  let sourceCursor = clipStart;
  let timelineCursor = 0;

  for (const silence of sorted) {
    if (silence.start > sourceCursor) {
      const dur = silence.start - sourceCursor;
      spans.push({
        sourceStart: sourceCursor,
        sourceEnd: silence.start,
        timelineStart: timelineCursor,
        timelineEnd: timelineCursor + dur,
      });
      timelineCursor += dur;
    }
    sourceCursor = silence.end;
  }

  if (sourceCursor < clipEnd) {
    const dur = clipEnd - sourceCursor;
    spans.push({
      sourceStart: sourceCursor,
      sourceEnd: clipEnd,
      timelineStart: timelineCursor,
      timelineEnd: timelineCursor + dur,
    });
    timelineCursor += dur;
  }

  return {
    spans,
    sourceDuration,
    timelineDuration: timelineCursor,
  };
}
