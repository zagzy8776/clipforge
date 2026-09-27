import type { TranscriptSegment } from "@clipforge/types";

export interface ParagraphOptions {
  /** Max gap in seconds to merge adjacent segments into one paragraph. */
  maxGapSeconds?: number;
  /** Max paragraph duration in seconds. */
  maxParagraphSeconds?: number;
}

/**
 * Group transcript segments into paragraphs based on temporal proximity.
 * A new paragraph starts when the gap between segments exceeds the threshold.
 */
export function groupIntoParagraphs(
  segments: TranscriptSegment[],
  opts?: ParagraphOptions,
): Array<{ start: number; end: number; text: string; segmentIds: number[] }> {
  const maxGap = opts?.maxGapSeconds ?? 2.0;
  const maxDur = opts?.maxParagraphSeconds ?? 45;

  if (segments.length === 0) return [];

  const paragraphs: Array<{ start: number; end: number; text: string; segmentIds: number[] }> = [];
  let current = {
    start: segments[0]!.start,
    end: segments[0]!.end,
    text: segments[0]!.text,
    segmentIds: [segments[0]!.id],
  };

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]!;
    const prevEnd = current.end;
    const gap = seg.start - prevEnd;
    const dur = seg.end - current.start;

    if (gap > maxGap || dur > maxDur) {
      paragraphs.push({ ...current });
      current = { start: seg.start, end: seg.end, text: seg.text, segmentIds: [seg.id] };
    } else {
      current.end = seg.end;
      current.text += " " + seg.text;
      current.segmentIds.push(seg.id);
    }
  }

  paragraphs.push({ ...current });
  return paragraphs;
}
