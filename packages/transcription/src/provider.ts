import { execFileSync } from "node:child_process";
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

export type TranscriptionProviderName = "silence-based-fallback" | "whisper" | "auto";

/**
 * Probe whether the Whisper Python sidecar is actually usable.
 * This is a *cheap* check: does a python interpreter exist and can it import
 * openai-whisper? It does NOT load the model (that would be slow / memory-heavy).
 */
export function whisperAvailable(): boolean {
  const pyBin = resolvePythonBin();
  if (!pyBin) return false;
  try {
    execFileSync(pyBin, ["-c", "import whisper; print(whisper.__version__)"], {
      stdio: "pipe", timeout: 15_000,
    });
    return true;
  } catch {
    return false;
  }
}

function resolvePythonBin(): string | null {
  for (const candidate of ["python3", "python"]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore", timeout: 3_000 });
      return candidate;
    } catch { /* try next */ }
  }
  return null;
}

/**
 * Factory: build a transcription provider honoring the configured provider name.
 *
 * Priority:
 *   - "whisper"            → Whisper, throw if unavailable (caller's choice)
 *   - "silence-based-fallback" → Mock provider (deterministic, no ML deps)
 *   - "auto" / undefined   → Whisper if importable, else mock
 *
 * Crucially this *probes* availability rather than trusting the constructor,
 * so a missing torch/openai-whisper stack degrades gracefully instead of
 * failing mid-job.
 */
export function createTranscriptionProvider(
  name: TranscriptionProviderName = "auto",
  opts?: { model?: string; language?: string; device?: "cpu" | "cuda" },
): TranscriptionProvider {
  if (name === "silence-based-fallback") {
    return new MockTranscriptionProvider();
  }

  if (name === "whisper") {
    return new WhisperTranscriptionProvider({
      model: opts?.model ?? "base",
      language: opts?.language ?? undefined,
      device: opts?.device ?? "cpu",
    });
  }

  // "auto" — prefer Whisper if the stack is actually importable.
  if (whisperAvailable()) {
    return new WhisperTranscriptionProvider({
      model: opts?.model ?? "base",
      language: opts?.language ?? undefined,
      device: opts?.device ?? "cpu",
    });
  }
  console.warn("  ⚠ Whisper stack not importable; falling back to silence-based transcription.");
  return new MockTranscriptionProvider();
}

/**
 * Wrap a provider so that any failure during transcription degrades to the
 * fallback provider instead of killing the job. This catches failures that
 * the eager probe above can't predict (e.g. a model download that fails
 * mid-run, or a transient sidecar error).
 */
export function withFallback(
  primary: TranscriptionProvider,
  fallback: TranscriptionProvider,
): TranscriptionProvider {
  return {
    name: `${primary.name}+${fallback.name}`,
    async transcribe(audioPath, opts) {
      try {
        return await primary.transcribe(audioPath, opts);
      } catch (err) {
        console.warn(
          `  ⚠ Transcription via ${primary.name} failed (${(err as Error).message.slice(0, 120)}); falling back to ${fallback.name}.`,
        );
        return fallback.transcribe(audioPath, opts);
      }
    },
  };
}

