import type { CandidateGenerator, RawCandidate } from "./index.js";

const CONTRAST_MARKERS = /\b(but |however|although|instead|yet |actually|rather than|contrary to|despite|on the other hand)\b/i;
const CONTRAST_PAIRS: [RegExp, RegExp][] = [
  [/\b(thought|believed|expected|assumed|was sure)\b/i, /\b(realized|discovered|learned|found out|actually)\b/i],
  [/\b(scared|terrified|afraid|worried)\b/i, /\b(brave|courage|overcame|faced)\b/i],
  [/\b(fail|failure|failed|lost)\b/i, /\b(succeed|success|won|triumph)\b/i],
  [/\b(old|before|used to)\b/i, /\b(new|now|after|became)\b/i],
];

export class ContrastFinder {
  readonly type = "contrast" as const;

  generate(segments: Array<{ start: number; end: number; text: string; id: number }>): RawCandidate[] {
    const candidates: RawCandidate[] = [];
    let id = 0;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]!;
      const text = seg.text;
      if (!CONTRAST_MARKERS.test(text)) continue;

      const endIdx = Math.min(i + 3, segments.length - 1);
      const window = segments.slice(i, endIdx + 1);
      const fullText = window.map((s) => s.text).join(" ");

      let pairScore = 0;
      for (const [before, after] of CONTRAST_PAIRS) {
        if (before.test(text) || before.test(fullText.slice(0, fullText.length / 2))) {
          if (after.test(fullText)) pairScore += 0.3;
        }
      }

      candidates.push({
        id: `contrast-${++id}`,
        start: window[0]!.start,
        end: window[window.length - 1]!.end,
        text: fullText,
        generator: "contrast",
        confidence: Math.min(0.9, 0.6 + pairScore),
        signals: { hook: false, completeThought: true, narrativeArc: false, emotionalShift: true, hasPayoff: false, hasQuestion: false, hasContrast: true },
      });
    }
    return candidates;
  }
}
