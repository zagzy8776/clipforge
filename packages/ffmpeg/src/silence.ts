import { execFileSync } from "node:child_process";
import { resolveFfmpeg } from "./binary.js";

export interface SilenceSpan { start: number; end: number; duration: number; }

export function detectSilence(audioOrVideoPath: string, options: { noiseDb?: number; minDuration?: number } = {}): SilenceSpan[] {
  const noise = options.noiseDb ?? -30;
  const minDur = options.minDuration ?? 0.4;
  let log = "";
  try {
    execFileSync(resolveFfmpeg(), ["-i", audioOrVideoPath, "-af", `silencedetect=noise=${noise}dB:d=${minDur}`, "-f", "null", "-"], { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err: any) {
    log = err.stderr?.toString?.() ?? "";
  }
  const spans: SilenceSpan[] = [];
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  const startRe = /silence_start: ([\d.]+)/g;
  const endRe = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
  while ((m = startRe.exec(log))) starts.push(parseFloat(m[1]!));
  let i = 0;
  while ((m = endRe.exec(log))) {
    const end = parseFloat(m[1]!);
    const dur = parseFloat(m[2]!);
    const start = starts[i++] ?? end - dur;
    spans.push({ start, end, duration: dur });
  }
  return spans;
}
