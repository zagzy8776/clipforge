export type { TranscriptionProvider } from "./provider.js";
export {
  createTranscriptionProvider,
  whisperAvailable,
  withFallback,
  type TranscriptionProviderName,
} from "./provider.js";
export { MockTranscriptionProvider } from "./providers/mock.js";
export { WhisperTranscriptionProvider, type WhisperOptions } from "./providers/whisper.js";
export { groupIntoParagraphs, type ParagraphOptions } from "./paragraphs.js";