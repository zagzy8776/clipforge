import type { TranscriptSegment } from "@clipforge/types";
import { MockTranscriptionProvider } from "./providers/mock.js";
import { WhisperTranscriptionProvider } from "./providers/whisper.js";

export interface TranscriptionProvider {
  readonly name: string;
  transcribe(audioPath: string, opts?: {
    language?: string;
    onProgress?: (p: number) => void;
  }): Promise<TranscriptSegment[]>;
}

/**
 * Factory: auto-detect the best available transcription provider.
 * Priority: Whisper (local) → silence-based fallback.
 */
export function createTranscriptionProvider(): TranscriptionProvider {
  try {
    return new WhisperTranscriptionProvider({ model: "base", device: "cpu" });
  } catch {
    // Whisper Python sidecar not available
  }
  return new MockTranscriptionProvider();
}

