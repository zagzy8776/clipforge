import type { CandidateGenerator, RawCandidate } from "./index.js";

const CURIOSITY = /\b(three things|three stories|you won't believe|what happened next|but then|little did i|the twist|what if|nobody knows|i want to tell you|let me explain|here is what|the secret|what most people|plot twist|ever wondered)\b/i;
const TRAIL_OFF = /\.{3,}|\u2026/;

export class CuriosityFinder {
  readonly type = "curiosity" as const;

  generate(segments: Array<{ start: number; end: number; text: string; id: number }>): RawCandidate[] {
    const candidates: RawCandidate[] = [];
    let id = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const text = seg.text;

      if (CURIOSITY.test(text) || TRAIL_OFF.test(text)) {
        // Expand to find the resolution (next 2-3 segments)
        const endIdx = Math.min(i + 3, segments.length - 1);
        const window = segments.slice(i, endIdx + 1);
        const fullText = window.map((s) => s.text).join(" ");

        candidates.push({
          id: `curiosity-${++id}`,
          start: window[0]!.start,
          end: window[window.length - 1]!.end,
          text: fullText,
          generator: "curiosity",
          confidence: CURIOSITY.test(text) ? 0.8 : 0.65,
          signals: { hook: true, completeThought: true, narrativeArc: false, emotionalShift: false, hasPayoff: false, hasQuestion: false, hasContrast: false },
        });
      }
    }
    return candidates;
  }
}
