import type { CandidateGenerator, RawCandidate } from "./index.js";

const HOOK_PATTERNS = /^(nobody|everyone|the biggest|here's the thing|what most|you need to|let me tell|the truth is|i learned|the secret|most people|here's what|listen|stop|imagine|i never|i didn't|the problem|i want to tell|today i|truth be told|but here|i'm honored|i'm going to|let me|i'll tell you|here's what i|nobody knows|the real|actually)/i;
const HOOK_SECONDARY = /\b(you won't believe|what happened|the first time|i discovered|the moment|i realized|nobody talks about|the problem with)\b/i;

export class HookFinder {
  readonly type = "hook" as const;

  generate(segments: Array<{ start: number; end: number; text: string; id: number }>): RawCandidate[] {
    const candidates: RawCandidate[] = [];
    let id = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const text = seg.text;

      // Direct hook pattern match
      if (HOOK_PATTERNS.test(text) || HOOK_SECONDARY.test(text)) {
        // Expand window: include this segment + next 2 for context
        const endIdx = Math.min(i + 3, segments.length - 1);
        const expanded = segments.slice(i, endIdx + 1);
        const start = expanded[0]!.start;
        const end = expanded[expanded.length - 1]!.end;
        const fullText = expanded.map((s) => s.text).join(" ");

        candidates.push({
          id: `hook-${++id}`,
          start, end,
          text: fullText,
          generator: "hook",
          confidence: HOOK_PATTERNS.test(text) ? 0.85 : 0.7,
          signals: { hook: true, completeThought: true, narrativeArc: false, emotionalShift: false, hasPayoff: false, hasQuestion: /[?]/.test(text), hasContrast: /\b(but|however|actually)\b/i.test(text) },
        });
      }

      // Strong statement (short punchy sentence at start of segment)
      const firstSentence = text.split(/[.!?]/)[0]?.trim() ?? "";
      if (firstSentence.length > 10 && firstSentence.length < 40 && /^(I |You |They |We |The |This |When )/.test(firstSentence)) {
        candidates.push({
          id: `hook-stmt-${++id}`,
          start: seg.start,
          end: Math.min(seg.end, seg.start + 20),
          text: firstSentence,
          generator: "hook",
          confidence: 0.6,
          signals: { hook: true, completeThought: false, narrativeArc: false, emotionalShift: false, hasPayoff: false, hasQuestion: false, hasContrast: false },
        });
      }
    }

    return candidates;
  }
}
