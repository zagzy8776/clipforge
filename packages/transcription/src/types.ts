export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker: string | null;
  words?: WordTimestamp[];
}

export interface TranscriptionOptions {
  language?: string;
  onProgress?: (progress: number) => void;
}

export interface TranscriptionProvider {
  readonly name: string;
  transcribe(audioPath: string, options?: TranscriptionOptions): Promise<TranscriptSegment[]>;
}
