/**
 * Groq Whisper-large-v3-turbo provider — fast production fallback.
 */
import type { TranscriptionProvider, TranscriptSegment, TranscriptionOptions } from "../types.js";
import { basename } from "node:path";

export interface GroqConfig { apiKey: string; model?: string; language?: string; }

export class GroqWhisperProvider implements TranscriptionProvider {
  readonly name = "groq-whisper";
  private config: Required<GroqConfig>;

  constructor(config: GroqConfig) {
    if (!config.apiKey) throw new Error("Groq API key required");
    this.config = { model: "whisper-large-v3-turbo", language: "en", ...config };
  }

  async transcribe(audioPath: string, options: TranscriptionOptions = {}): Promise<TranscriptSegment[]> {
    const form = new FormData();
    const fs = await import("node:fs/promises");
    const buf = await fs.readFile(audioPath);
    form.append("file", new Blob([buf], { type: "audio/wav" }), basename(audioPath));
    form.append("model", this.config.model);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
    if (options.language ?? this.config.language) {
      form.append("language", options.language ?? this.config.language);
    }
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
      body: form,
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq Whisper error ${response.status}: ${err}`);
    }
    const data = await response.json() as any;
    if (data.segments?.length) {
      return data.segments.map((seg: any, i: number) => ({
        id: i, start: seg.start, end: seg.end, text: seg.text.trim(), confidence: 0.9, speaker: null,
        words: seg.words?.map((w: any) => ({ word: w.word, start: w.start, end: w.end, confidence: 0.9 })),
      }));
    }
    return [{ id: 0, start: 0, end: data.duration ?? 0, text: data.text ?? "", confidence: 0.85, speaker: null }];
  }
}
