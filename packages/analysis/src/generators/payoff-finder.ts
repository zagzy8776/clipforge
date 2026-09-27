import type { CandidateGenerator, RawCandidate } from "./index.js";

const PAYOFF_MARKERS = /\b(looking back|that's when i realized|in the end|it turned out|the lesson|best decision|worst decision|changed everything|it was one of|i finally|years later|and that's how|that changed|it turns out|the result|the outcome)\b/i;

export class PayoffFinder {
  readonly type = "payoff" as const;

  generate(segments: Array<{ start: number; end: number; text: string; id: number }>): RawCandidate[] {
    const candidates: RawCandidate[] = [];
    let id = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      if (!PAYOFF_MARKERS.test(seg.text)) continue;

      // Search backward for context (up to 4 segments)
      let contextStart = Math.max(0, i - 4);
      for (let back = i - 1; back >= Math.max(0, i - 4); back--) {
        if (back >= 0 && PAYOFF_MARKERS.test(segments[back]!.text)) {
          break; // Don't include another payoff in context
        }
        contextStart = back;
      }

      // Include payoff + 1 segment after for completeness
      const endIdx = Math.min(i + 2, segments.length - 1);
      const window = segments.slice(contextStart, endIdx + 1);
      const start = window[0]!.start;
      const end = window[window.length - 1]!.end;
      const text = window.map((s) => s.text).join(" ");

      candidates.push({
        id: `payoff-${++id}`,
        start, end, text,
        generator: "payoff",
        confidence: 0.75,
        signals: { hook: false, completeThought: true, narrativeArc: true, emotionalShift: false, hasPayoff: true, hasQuestion: false, hasContrast: false },
      });
    }
    return candidates;
  }
}
