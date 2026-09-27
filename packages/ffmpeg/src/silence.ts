import { execFfmpeg } from "./exec.js";

export interface SilenceSpan {
  start: number;
  end: number;
  duration: number;
}

/**
 * Detect silence spans in an audio (or video) file using ffmpeg silencedetect.
 *
 * @param filePath   Audio or video file.
 * @param thresholdDb Silence threshold in dB. Default -35 dB.
 * @param minDuration Minimum silence duration in seconds. Default 0.5.
 */
export function detectSilences(
  filePath: string,
  thresholdDb = -35,
  minDuration = 0.5,
): SilenceSpan[] {
  const { stderr } = execFfmpeg(
    [
      "-i", filePath,
      "-af", `silencedetect=noise=${thresholdDb}dB:d=${minDuration}`,
      "-f", "null",
      "-",
    ],
    { allowFail: true },
  );

  return parseSilenceOutput(stderr);
}

/** Parse ffmpeg silencedetect stderr output into structured spans. */
function parseSilenceOutput(output: string): SilenceSpan[] {
  const spans: SilenceSpan[] = [];
  const lines = output.split("\n");

  let currentStart: number | null = null;

  for (const line of lines) {
    const startMatch = line.match(/silence_start:\s*([\d.]+)/);
    const endMatch = line.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);

    if (startMatch) {
      currentStart = parseFloat(startMatch[1]!);
    }

    if (endMatch && currentStart !== null) {
      const end = parseFloat(endMatch[1]!);
      const duration = parseFloat(endMatch[2]!);
      spans.push({ start: currentStart, end, duration });
      currentStart = null;
    }
  }

  return spans;
}
