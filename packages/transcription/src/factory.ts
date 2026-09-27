import type { TranscriptionProvider } from "./types.js";
import { DeepgramProvider } from "./providers/deepgram.js";
import { GroqWhisperProvider } from "./providers/groq.js";
import { SilenceFallbackProvider } from "./providers/silence-fallback.js";

export type ProviderName = "deepgram" | "groq" | "silence-based-fallback" | "auto";

export function createTranscriptionProvider(
  name: ProviderName = "auto",
  options: { model?: string; language?: string; device?: string } = {},
): TranscriptionProvider {
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (name === "deepgram" || (name === "auto" && deepgramKey)) {
    if (!deepgramKey) throw new Error("DEEPGRAM_API_KEY required for deepgram provider");
    return new DeepgramProvider({
      apiKey: deepgramKey,
      model: options.model ?? "nova-3",
      language: options.language ?? "en",
      diarize: true,
    });
  }

  if (name === "groq" || (name === "auto" && groqKey)) {
    if (!groqKey) throw new Error("GROQ_API_KEY required for groq provider");
    return new GroqWhisperProvider({
      apiKey: groqKey,
      model: options.model ?? "whisper-large-v3-turbo",
      language: options.language ?? "en",
    });
  }

  return new SilenceFallbackProvider();
}

export function withFallback(
  primary: TranscriptionProvider,
  fallback: TranscriptionProvider = new SilenceFallbackProvider(),
): TranscriptionProvider {
  return {
    name: `${primary.name}+fallback`,
    async transcribe(audioPath, options) {
      try {
        return await primary.transcribe(audioPath, options);
      } catch (err) {
        console.warn(`[transcription] ${primary.name} failed, falling back to ${fallback.name}:`, err);
        return fallback.transcribe(audioPath, options);
      }
    },
  };
}
