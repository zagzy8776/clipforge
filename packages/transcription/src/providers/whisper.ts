import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { TranscriptSegment } from "@clipforge/types";
import type { TranscriptionProvider } from "../provider.js";
import { resolveFfmpeg } from "@clipforge/ffmpeg";

const __dir = dirname(fileURLToPath(import.meta.url));
// From packages/transcription/src/providers/ → go up 4 levels to root
const SIDECAR = join(__dir, "..", "..", "..", "..", "tools", "whisper_transcribe.py");

export interface WhisperOptions {
  model?: string;
  language?: string;
  device?: "cpu" | "cuda";
}

/**
 * Real transcription provider using OpenAI Whisper (local, no API key).
 * Shells out to a Python sidecar that runs the whisper model.
 */
export class WhisperTranscriptionProvider implements TranscriptionProvider {
  readonly name: string;
  private model: string;
  private language: string | null;
  private device: string;

  constructor(opts?: WhisperOptions) {
    this.model = opts?.model ?? "base";
    this.language = opts?.language ?? null;
    this.device = opts?.device ?? "cpu";
    this.name = `whisper-${this.model}`;
  }

  async transcribe(audioPath: string, opts?: {
    language?: string;
    onProgress?: (p: number) => void;
  }): Promise<TranscriptSegment[]> {
    opts?.onProgress?.(0.05);

    const args = [
      SIDECAR,
      audioPath,
      "--model", this.model,
      "--device", this.device,
    ];
    if (this.language || opts?.language) {
      args.push("--language", this.language ?? opts!.language!);
    }

    opts?.onProgress?.(0.1);

    // Resolve the python interpreter (python3 preferred on Linux servers) and
    // pass the resolved ffmpeg binary so whisper's internal load_audio() works
    // regardless of platform or PATH state.
    const pythonBin = resolvePythonBin();
    let ffmpegBin: string | null = null;
    try { ffmpegBin = resolveFfmpeg(); } catch { /* fall back to PATH */ }

    let stdout: string;
    try {
      const result = execFileSync(pythonBin, args, {
        stdio: "pipe",
        timeout: 30 * 60_000, // 30 min for large models
        maxBuffer: 50 * 1024 * 1024,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          ...(ffmpegBin ? { CLIPFORGE_FFMPEG: ffmpegBin } : {}),
        },
      });
      stdout = result.toString("utf-8");
    } catch (err: unknown) {
      const e = err as { stderr?: Buffer; message?: string };
      throw new Error(
        `Whisper transcription failed: ${e.message}\n${e.stderr?.toString("utf-8") ?? ""}`,
      );
    }

    opts?.onProgress?.(0.9);

    const parsed = JSON.parse(stdout) as {
      language: string;
      model: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
        words?: Array<{ start: number; end: number; text: string }>;
        speaker?: string | null;
      }>;
    };

    opts?.onProgress?.(1);

    return parsed.segments.map((s, i) => ({
      id: i,
      start: s.start,
      end: s.end,
      text: s.text,
      words: s.words?.map((w) => ({ text: w.text, start: w.start, end: w.end })),
      speaker: s.speaker ?? null,
    }));
  }
}

/**
 * Resolve the Python interpreter to shell out to.
 * Tries `python3` first (standard on Linux servers), then `python`.
 */
function resolvePythonBin(): string {
  for (const candidate of ["python3", "python"]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore", timeout: 3_000 });
      return candidate;
    } catch { /* try next */ }
  }
  throw new Error(
    "No Python interpreter found for Whisper transcription. Install python3 or set PATH.",
  );
}
