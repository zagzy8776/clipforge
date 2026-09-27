export type { AIProvider } from "./provider.js";
export { createProvider } from "./provider.js";
export { MockAIProvider } from "./providers/mock.js";
export { OpenAIProvider } from "./providers/openai.js";
export { scoreText, extractKeywords, detectNarrativeArc, type ScoreResult, type NarrativeArc } from "./providers/signals.js";
