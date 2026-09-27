import type { CandidateGenerator, RawCandidate } from "./index.js";

const EMOTION_STRONG = /\b(terrified|desperate|devastated|incredible|amazing|passionate|heartbreak|furious|ecstatic|overwhelming|fear|love|hate|anger|joy|grief|pain|sacrifice|struggle|nightmare|dream|impossible|insane|beautiful|tragic|horrible)\b/gi;
const EMOTION_MEDIUM = /\b(scared|worried|excited|nervous|proud|grateful|inspired|touched|confused|frustrated|disappointed|angry|happy|sad|honest|real|raw|vulnerable)\b/gi;
const CONTRAST = /\b(but|yet|although|however|though|while|instead|rather)\b/i;

export class EmotionFinder {
  readonly type = "emotion" as const;

  generate(segments: Array<{ start: number; end: number; text: string; id: number }>): RawCandidate[] {
    const candidates: RawCandidate[] = [];
    let id = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const text = seg.text;
      const strongCount = (text.match(EMOTION_STRONG) ?? []).length;
      const medCount = (text.match(EMOTION_MEDIUM) ?? []).length;
      const density = (strongCount * 2 + medCount) / Math.max(1, text.split(/\s+/).length);

      if (strongCount > 0 || medCount >= 2) {
        // Find emotional peak within 3-segment window
        const window = segments.slice(Math.max(0, i - 1), Math.min(i + 3, segments.length));
        const start = window[0]!.start;
        const end = window[window.length - 1]!.end;
        const windowText = window.map((s) => s.text).join(" ");
        const hasShift = CONTRAST.test(windowText);

        candidates.push({
          id: `emotion-${++id}`,
          start, end, text: windowText,
          generator: "emotion",
          confidence: strongCount > 0 ? 0.8 : 0.6,
          signals: { hook: false, completeThought: true, narrativeArc: false, emotionalShift: hasShift, hasPayoff: false, hasQuestion: false, hasContrast: hasShift },
        });
      }
    }
    return candidates;
  }
}
