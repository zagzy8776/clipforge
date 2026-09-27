import type { TranscriptSegment, TranscriptSection, CandidateMoment } from "@clipforge/types";
import type { AIProvider } from "@clipforge/ai";
import { scoreText } from "@clipforge/ai";

export interface CandidateInput {
  provider: AIProvider;
  sections: TranscriptSection[];
  segments: TranscriptSegment[];
  projectId: string;
  targetClips: number;
  minDuration: number;
  maxDuration: number;
  stride: number;
}

/**
 * Pass 2: Generate candidate moments from each section.
 * Uses both LLM-driven and heuristic detection.
 */
export async function generateCandidates(input: CandidateInput): Promise<CandidateMoment[]> {
  const allCandidates: CandidateMoment[] = [];
  let idx = 0;

  for (const section of input.sections) {
    // Get segments within this section
    const sectionSegs = input.segments.filter(
      (s) => s.start >= section.start && s.end <= section.end,
    );
    if (sectionSegs.length < 3) continue;

    // Ask the AI for moments
    const moments = await input.provider.findMoments({
      sectionText: sectionSegs.map((s) => s.text).join(" "),
      sectionStart: section.start,
      sectionEnd: section.end,
      transcriptSegments: sectionSegs.map((s) => ({
        start: s.start, end: s.end, text: s.text,
      })),
    });

    // Convert moments to CandidateMoment objects
    for (const m of moments) {
      const dur = m.end - m.start;
      if (dur < input.minDuration || dur > input.maxDuration) continue;

      const segsInRange = sectionSegs.filter(
        (s) => s.start >= m.start - 1 && s.end <= m.end + 1,
      );
      const text = segsInRange.map((s) => s.text).join(" ");
      const score = scoreText(text);

      allCandidates.push({
        id: `${input.projectId}-candidate-${String(idx).padStart(3, "0")}`,
        index: idx,
        projectId: input.projectId,
        sectionId: section.id,
        start: m.start,
        end: m.end,
        duration: dur,
        text,
        segmentIds: segsInRange.map((s) => s.id),
        paragraphIds: [],
        boundaryBasis: { start: "sentence", end: "sentence" },
        label: text.slice(0, 60) + "...",
        source: "heuristic",
        score: {
          dimensions: {
            hook: score.hook, emotion: score.emotion, novelty: score.novelty,
            information: score.information, curiosity: score.curiosity,
            payoff: score.payoff, coherence: score.coherence,
          },
          weights: { hook: 0.20, emotion: 0.15, novelty: 0.15, information: 0.15, curiosity: 0.10, payoff: 0.15, coherence: 0.10 },
          overall: score.overall,
          reasons: score.reasons,
          scorer: "heuristic-v1",
        },
        kept: true,
      });
      idx++;
    }
  }

  return allCandidates;
}
