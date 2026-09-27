import type { CandidateGenerator, RawCandidate } from "./index.js";

const QUESTION = /[?]/;
const QUESTION_STARTERS = /^(how|why|what if|what happens|what would|do you|have you|can you|is it|are we|when did|where did|who is|who was)/i;

export class QuestionFinder {
  readonly type = "question" as const;

  generate(segments: Array<{ start: number; end: number; text: string; id: number }>): RawCandidate[] {
    const candidates: RawCandidate[] = [];
    let id = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const text = seg.text;

      if (QUESTION.test(text) || QUESTION_STARTERS.test(text)) {
        // Find the answer: look forward for the next 2-3 segments
        const answerEnd = Math.min(i + 3, segments.length - 1);
        const answerWindow = segments.slice(i, answerEnd + 1);
        const start = answerWindow[0]!.start;
        const end = answerWindow[answerWindow.length - 1]!.end;
        const fullText = answerWindow.map((s) => s.text).join(" ");

        candidates.push({
          id: `question-${++id}`,
          start, end, text: fullText,
          generator: "question",
          confidence: 0.75,
          signals: { hook: true, completeThought: true, narrativeArc: false, emotionalShift: false, hasPayoff: false, hasQuestion: true, hasContrast: false },
        });
      }
    }
    return candidates;
  }
}
