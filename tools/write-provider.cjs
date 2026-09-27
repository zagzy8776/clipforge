var fs = require("fs");
var code = `import { MockAIProvider } from "./providers/mock.js";
import { OpenAIProvider } from "./providers/openai.js";

export interface AIProvider {
  readonly name: string;
  understandTranscript(input: { transcript: string; sections: Array<{ start: number; end: number; text: string }>; duration: number; }): Promise<UnderstandResult>;
  findMoments(input: { sectionText: string; sectionStart: number; sectionEnd: number; transcriptSegments: Array<{ start: number; end: number; text: string }>; }): Promise<MomentResult[]>;
  scoreMoments(input: { candidates: Array<{ text: string; start: number; end: number; duration: number }>; }): Promise<ScoredMoment[]>;
  generateMetadata(input: { text: string; start?: number; end?: number; duration: number; fullTranscriptSummary: string; }): Promise<ClipMetadata>;
}
export interface UnderstandResult { sections: Array<{ start: number; end: number; title: string; summary: string; topics: string[] }>; speakers: string[]; overallSummary: string; }
export interface MomentResult { start: number; end: number; reason: string; }
export interface ScoredMoment { dimensions: { hook: number; emotion: number; novelty: number; information: number; curiosity: number; payoff: number; coherence: number; }; reasons: string[]; }
export interface ClipMetadata { title: string; hook: string; description: string; hashtags: string[]; alternativeHooks: string[]; suggestedPlatforms: string[]; }
export type ProviderName = "heuristic" | "openai" | "hybrid";

export function createProvider(name?: ProviderName): AIProvider {
  const requested = name ?? process.env.CLIPFORGE_PROVIDER ?? "heuristic";
  if (requested === "openai" || requested === "hybrid") {
    if (process.env.OPENAI_API_KEY) { return new OpenAIProvider(); }
    console.warn(\`  ⚠ Provider "\${requested}" requested but OPENAI_API_KEY not set. Using heuristic.\`);
  }
  return new MockAIProvider();
}
`;
fs.writeFileSync("e:/video/packages/ai/src/provider.ts", code, "utf-8");
console.log("Wrote provider.ts");
