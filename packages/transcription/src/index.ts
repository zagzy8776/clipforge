export type {
  TranscriptionProvider,
  TranscriptionProviderName,
  TranscriptionOptions,
} from "./provider.js";
export {
  createTranscriptionProvider,
  withFallback,
  whisperAvailable,
} from "./provider.js";
export { MockTranscriptionProvider } from "./providers/mock.js";
export { WhisperTranscriptionProvider } from "./providers/whisper.js";
export { DeepgramProvider } from "./providers/deepgram.js";
export { GroqWhisperProvider } from "./providers/groq.js";
export { groupIntoParagraphs, type ParagraphOptions } from "./paragraphs.js";
export { detectFillers, stripFillersFromText, type FillerSpan } from "./filler.js";
