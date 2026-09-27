import type {
  AIProvider, UnderstandResult, MomentResult, ScoredMoment, ClipMetadata,
} from "../provider.js";
import { scoreText, extractKeywords, extractTopic, summarizeSection } from "./signals.js";

/**
 * Deterministic heuristic AI provider. When no real API key is available,
 * uses lexical heuristics so the full pipeline runs end-to-end.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "heuristic-local";

  async understandTranscript(input: {
    transcript: string;
    sections: Array<{ start: number; end: number; text: string }>;
    duration: number;
  }): Promise<UnderstandResult> {
    return {
      sections: input.sections.map((s) => ({
        start: s.start, end: s.end,
        title: extractTopic(s.text),
        summary: summarizeSection(s.text),
        topics: extractKeywords(s.text),
      })),
      speakers: ["Speaker A", "Speaker B"],
      overallSummary: `A ${Math.round(input.duration / 60)}-minute conversation covering ${input.sections.length} topics.`,
    };
  }

  async findMoments(input: {
    sectionText: string;
    sectionStart: number;
    sectionEnd: number;
    transcriptSegments: Array<{ start: number; end: number; text: string }>;
  }): Promise<MomentResult[]> {
    const moments: MomentResult[] = [];
    const segs = input.transcriptSegments;
    for (let i = 0; i < segs.length - 5; i += 2) {
      const win = segs.slice(i, i + 5);
      const start = win[0]!.start;
      const end = win[win.length - 1]!.end;
      const text = win.map((s) => s.text).join(" ");
      const dur = end - start;
      if (dur < 15 || dur > 120) continue;
      const s = scoreText(text);
      if (s.overall > 25) moments.push({ start, end, reason: s.reasons.join(", ") });
    }
    return moments;
  }

  async scoreMoments(input: {
    candidates: Array<{ text: string; start: number; end: number; duration: number }>;
  }): Promise<ScoredMoment[]> {
    return input.candidates.map((c) => {
      const s = scoreText(c.text);
      return {
        dimensions: {
          hook: s.hook, emotion: s.emotion, novelty: s.novelty,
          information: s.information, curiosity: s.curiosity,
          payoff: s.payoff, coherence: s.coherence,
        },
        reasons: s.reasons,
      };
    });
  }

  async generateMetadata(input: {
    text: string; duration: number; fullTranscriptSummary: string;
  }): Promise<ClipMetadata> {
    const sentences = input.text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
    const title = (sentences[0]?.trim().slice(0, 80) ?? "Untitled Clip");
    const hook = (sentences[0]?.trim().slice(0, 120) ?? "Watch this clip");
    const kw = extractKeywords(input.text);
    return {
      title: cap(title), hook: cap(hook),
      description: sentences.slice(0, 3).join(". ").trim() + ".",
      hashtags: kw.slice(0, 5).map((k) => `#${k.replace(/\s+/g, "")}`),
      alternativeHooks: [hook, `Here's what most people miss about ${kw[0] ?? "this"}.`, `You need to hear this.`],
      suggestedPlatforms: ["YouTube Shorts", "TikTok", "Instagram Reels"],
    };
  }
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
