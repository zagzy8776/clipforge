import type { TranscriptSegment } from "@clipforge/types";
import type { TranscriptionProvider } from "../provider.js";
import { detectSilences } from "@clipforge/ffmpeg";

/**
 * Fallback transcription provider.
 *
 * Uses ffmpeg silence detection to produce rough segment boundaries,
 * then splits those spans into speech-like chunks. This is NOT meant
 * to produce accurate text — it ensures the pipeline completes when
 * no real STT provider is configured.
 *
 * For production: use Whisper API, Deepgram, or Groq.
 */
export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly name = "silence-based-fallback";

  async transcribe(audioPath: string, opts?: {
    language?: string;
    onProgress?: (p: number) => void;
  }): Promise<TranscriptSegment[]> {
    opts?.onProgress?.(0.1);

    // Detect silence to find speech spans
    const silences = detectSilences(audioPath, -35, 0.5);

    // Get total duration via ffprobe (import from @clipforge/ffmpeg)
    const { probe } = await import("@clipforge/ffmpeg");
    const info = probe(audioPath);
    const totalDuration = info.duration;

    opts?.onProgress?.(0.5);

    // Build speech spans from silence gaps
    const speechSpans = invertSilences(silences, totalDuration);

    // Split long spans into ~8-second segments (mimicking STT output)
    const segments: TranscriptSegment[] = [];
    let id = 0;
    const maxSegDur = 8;

    for (const span of speechSpans) {
      const spanDur = span.end - span.start;
      if (spanDur < 1) continue;

      if (spanDur <= maxSegDur) {
        segments.push({
          id: id++,
          start: span.start,
          end: span.end,
          text: `[speech ${fmtTime(span.start)}–${fmtTime(span.end)}]`,
        });
      } else {
        // Split into chunks
        let t = span.start;
        while (t < span.end) {
          const chunkEnd = Math.min(t + maxSegDur, span.end);
          segments.push({
            id: id++,
            start: t,
            end: chunkEnd,
            text: `[speech ${fmtTime(t)}–${fmtTime(chunkEnd)}]`,
          });
          t = chunkEnd;
        }
      }
    }

    opts?.onProgress?.(1);
    return segments;
  }
}

function invertSilences(
  silences: Array<{ start: number; end: number }>,
  totalDuration: number,
): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  const sorted = [...silences].sort((a, b) => a.start - b.start);

  for (const s of sorted) {
    if (s.start > cursor) {
      spans.push({ start: cursor, end: s.start });
    }
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < totalDuration) {
    spans.push({ start: cursor, end: totalDuration });
  }
  return spans;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
