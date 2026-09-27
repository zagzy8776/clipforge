import type { TranscriptSegment, TranscriptSection } from "@clipforge/types";
import type { AIProvider } from "@clipforge/ai";

export interface AnalysisInput {
  provider: AIProvider;
  segments: TranscriptSegment[];
  duration: number;
}

export interface AnalysisOutput {
  sections: TranscriptSection[];
  speakers: string[];
  summary: string;
}

/**
 * Pass 1: Understand the entire video.
 * Break the transcript into semantic sections with topics.
 */
export async function analyzeTranscript(input: AnalysisInput): Promise<AnalysisOutput> {
  // Group segments into paragraph-like chunks for the AI
  const chunks = buildChunks(input.segments, 30); // ~30 segments per chunk
  const sectionInput = chunks.map((c) => ({
    start: c[0]!.start,
    end: c[c.length - 1]!.end,
    text: c.map((s) => s.text).join(" "),
  }));

  const result = await input.provider.understandTranscript({
    transcript: input.segments.map((s) => s.text).join(" "),
    sections: sectionInput,
    duration: input.duration,
  });

  const sections: TranscriptSection[] = result.sections.map((s, i) => ({
    id: `section-${i}`,
    index: i,
    start: s.start,
    end: s.end,
    title: s.title,
    summary: s.summary,
    topics: s.topics,
    paragraphIds: [],
  }));

  return { sections, speakers: result.speakers, summary: result.overallSummary };
}

/** Split segments into roughly equal-sized chunks. */
function buildChunks<T>(arr: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}
