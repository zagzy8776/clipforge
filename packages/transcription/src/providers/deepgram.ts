/**
 * Deepgram Nova-3 provider — production primary STT.
 * Word-level timestamps + speaker diarization.
 */
import type { TranscriptSegment } from "@clipforge/types";
import type { TranscriptionProvider, TranscriptionOptions } from "../provider.js";

export interface DeepgramConfig {
  apiKey: string;
  model?: string;
  language?: string;
  diarize?: boolean;
  punctuate?: boolean;
  utterances?: boolean;
}

export class DeepgramProvider implements TranscriptionProvider {
  readonly name = "deepgram";
  private config: Required<DeepgramConfig>;

  constructor(config: DeepgramConfig) {
    if (!config.apiKey) throw new Error("Deepgram API key required");
    this.config = {
      model: "nova-3",
      language: "en",
      diarize: true,
      punctuate: true,
      utterances: true,
      ...config,
    };
  }

  async transcribe(audioPath: string, options: TranscriptionOptions = {}): Promise<TranscriptSegment[]> {
    const fs = await import("node:fs");
    const audioBuffer = fs.readFileSync(audioPath);
    const params = new URLSearchParams({
      model: this.config.model,
      language: options.language ?? this.config.language,
      diarize: String(this.config.diarize),
      punctuate: String(this.config.punctuate),
      utterances: String(this.config.utterances),
      smart_format: "true",
      words: "true",
    });
    const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: "POST",
      headers: { Authorization: `Token ${this.config.apiKey}`, "Content-Type": "audio/wav" },
      body: audioBuffer,
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Deepgram error ${response.status}: ${err}`);
    }
    const data = await response.json() as any;
    return this.mapToSegments(data);
  }

  private mapToSegments(data: any): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const results = data.results?.channels?.[0]?.alternatives?.[0];
    if (!results) return segments;
    if (results.words?.length) {
      let current: TranscriptSegment | null = null;
      for (const word of results.words) {
        const speaker = word.speaker ?? 0;
        if (!current || current.speaker !== `speaker_${speaker}`) {
          if (current) segments.push(current);
          current = {
            id: segments.length,
            start: word.start,
            end: word.end,
            text: word.punctuated_word ?? word.word,
            confidence: word.confidence ?? 0.9,
            speaker: `speaker_${speaker}`,
            words: [],
          };
        } else {
          current.end = word.end;
          current.text += " " + (word.punctuated_word ?? word.word);
        }
        current.words!.push({ text: word.word, start: word.start, end: word.end, confidence: word.confidence ?? 0.9 });
      }
      if (current) segments.push(current);
    } else if (results.transcript) {
      segments.push({
        id: 0, start: 0, end: data.metadata?.duration ?? 0,
        text: results.transcript, confidence: results.confidence ?? 0.8, speaker: null,
      });
    }
    return segments;
  }
}
