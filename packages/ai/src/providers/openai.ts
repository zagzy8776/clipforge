import type {
  AIProvider, UnderstandResult, MomentResult, ScoredMoment, ClipMetadata,
} from "../provider.js";

/**
 * OpenAI GPT-4 provider for content analysis.
 * Uses the same interface as MockAIProvider but calls GPT-4 for
 * semantic understanding, candidate generation, and scoring.
 *
 * Requires OPENAI_API_KEY environment variable.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai-gpt4";
  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = opts?.model ?? "gpt-4o";
    if (!this.apiKey) {
      throw new Error("OpenAI API key required. Set OPENAI_API_KEY env var.");
    }
  }

  async understandTranscript(input: {
    transcript: string;
    sections: Array<{ start: number; end: number; text: string }>;
    duration: number;
  }): Promise<UnderstandResult> {
    const prompt = `You are a video content analyst. Analyze this ${Math.round(input.duration / 60)}-minute video transcript and identify thematic sections.

For each section, provide:
- start/end timestamps
- A short title
- A 1-2 sentence summary
- Key topics

Return JSON: { sections: [{start, end, title, summary, topics}], speakers: string[], overallSummary: string }

Transcript:
${input.transcript.slice(0, 8000)}`;

    const result = await this.call<UnderstandResult>(prompt);
    return result;
  }

  async findMoments(input: {
    sectionText: string;
    sectionStart: number;
    sectionEnd: number;
    transcriptSegments: Array<{ start: number; end: number; text: string }>;
  }): Promise<MomentResult[]> {
    const prompt = `You are a short-form video editor. Find the most compelling moments in this section that could stand alone as 30-90 second clips.

Look for:
- Strong opening hooks
- Emotional peaks
- Surprising statements
- Complete mini-stories (setup → tension → payoff)
- Curiosity-generating moments
- Questions followed by answers

For each moment, provide start/end timestamps and why it's compelling.

Return JSON: [{start, end, reason}]

Section text:
${input.sectionText.slice(0, 4000)}

Segments:
${input.transcriptSegments.map(s => `[${s.start.toFixed(1)}s] ${s.text}`).join("\n")}`;

    const result = await this.call<MomentResult[]>(prompt);
    return Array.isArray(result) ? result : [];
  }

  async scoreMoments(input: {
    candidates: Array<{ text: string; start: number; end: number; duration: number }>;
  }): Promise<ScoredMoment[]> {
    const prompt = `Score these video clip candidates for short-form engagement potential (0-100 each).
Consider: hook strength, emotional resonance, novelty, information density, curiosity factor, narrative completeness, and coherence.

Return JSON array: [{dimensions: {hook, emotion, novelty, information, curiosity, payoff, coherence}, reasons: string[]}]

Candidates:
${input.candidates.map((c, i) => `#${i + 1} [${c.duration.toFixed(0)}s] ${c.text.slice(0, 200)}`).join("\n\n")}`;

    const result = await this.call<ScoredMoment[]>(prompt);
    return Array.isArray(result) ? result : [];
  }

  async generateMetadata(input: {
    text: string;
    duration: number;
    fullTranscriptSummary: string;
  }): Promise<ClipMetadata> {
    const prompt = `Generate engaging metadata for this short-form video clip.
Return JSON: { title: string, hook: string, description: string, hashtags: string[], alternativeHooks: string[], suggestedPlatforms: string[] }

Clip text:
${input.text.slice(0, 500)}

Context: This is from a longer video about: ${input.fullTranscriptSummary.slice(0, 200)}`;

    return this.call<ClipMetadata>(prompt);
  }

  private async call<T>(prompt: string): Promise<T> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as T;
  }
}
