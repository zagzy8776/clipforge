import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface BeatData {
  bpm: number;
  beats: number[];
  downbeats: number[];
  energy: Array<{ time: number; value: number }>;
  duration: number;
  onset_strength?: Array<{ time: number; value: number }>;
}

const __dir = dirname(fileURLToPath(import.meta.url));
const SIDECAR = join(__dir, "..", "..", "..", "..", "tools", "beat_detect.py");

/**
 * Detect BPM, beats, and energy curve from audio/video.
 * Uses librosa (Python) when available, falls back to basic autocorrelation.
 */
export function detectBeats(audioPath: string): BeatData {
  try {
    const result = execFileSync("python", [SIDECAR, audioPath], {
      stdio: "pipe",
      timeout: 5 * 60_000,
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(result.toString("utf-8"));
  } catch {
    return { bpm: 0, beats: [], downbeats: [], energy: [], duration: 0 };
  }
}

/**
 * Find the nearest beat to a given timestamp.
 * Useful for syncing effects (punch-ins, transitions) to musical beats.
 */
export function nearestBeat(time: number, beats: number[]): number {
  if (beats.length === 0) return time;
  let closest = beats[0]!;
  let minDist = Math.abs(time - closest);
  for (const b of beats) {
    const d = Math.abs(time - b);
    if (d < minDist) { minDist = d; closest = b; }
  }
  return closest;
}

/**
 * Get the energy level at a given time (interpolated from energy curve).
 */
export function energyAt(time: number, energy: Array<{ time: number; value: number }>): number {
  if (energy.length === 0) return 0.5;
  for (let i = 0; i < energy.length - 1; i++) {
    if (time >= energy[i]!.time && time <= energy[i + 1]!.time) {
      const t = (time - energy[i]!.time) / (energy[i + 1]!.time - energy[i]!.time);
      return energy[i]!.value + t * (energy[i + 1]!.value - energy[i]!.value);
    }
  }
  return energy[energy.length - 1]!.value;
}
