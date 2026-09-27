import type { CandidateGenerator, RawCandidate } from "./index.js";

const SETUP = /\b(first|then|before|when i|years ago|one day|that day|starting|started|i was|we were|it began)\b/i;
const TENSION = /\b(but|however|although|problem|struggle|fail|difficult|scared|terrified|worried)\b/i;
const TURN = /\b(but then|but here|but actually|then suddenly|and that's when|but looking back)\b/i;
const RESOLUTION = /\b(learned|realized|understood|changed|became|decided|ended up|finally|in the end|turns out)\b/i;

export class StoryFinder {
  readonly type = "story" as const;

  generate(segments: Array<{ start: number; end: number; text: string; id: number }>): RawCandidate[] {
    const candidates: RawCandidate[] = [];
    let id = 0;

    // Sliding window of 3-5 segments looking for story arcs
    for (let i = 0; i < segments.length - 2; i++) {
      for (let windowSize = 3; windowSize <= Math.min(5, segments.length - i); windowSize++) {
        const window = segments.slice(i, i + windowSize);
        const text = window.map((s) => s.text).join(" ");
        const arc = detectArc(text);
        const dur = window[window.length - 1]!.end - window[0]!.start;

        if (dur > 90) continue; // Skip windows that are too long
        if (arc.setup && arc.payoff && windowSize >= 3) {
          candidates.push({
            id: `story-${++id}`,
            start: window[0]!.start,
            end: window[window.length - 1]!.end,
            text,
            generator: "story",
            confidence: arc.turn ? 0.8 : 0.65,
            signals: { hook: false, completeThought: true, narrativeArc: true, emotionalShift: arc.turn, hasPayoff: true, hasQuestion: false, hasContrast: arc.turn },
          });
        }
      }
    }
    return candidates;
  }
}

function detectArc(text: string): { setup: boolean; tension: boolean; turn: boolean; payoff: boolean } {
  return {
    setup: SETUP.test(text), tension: TENSION.test(text),
    turn: TURN.test(text), payoff: RESOLUTION.test(text),
  };
}
