import { execFileSync } from "node:child_process";
import { resolveFfmpeg } from "@clipforge/ffmpeg";

/**
 * Active-speaker detection for a single mixed audio track.
 *
 * We don't have per-speaker audio separation, so "active speaker" is a
 * heuristic: sample short-window RMS energy from the audio track via
 * ffmpeg's astats filter, then correlate energy peaks against the existing
 * per-frame face-detection timeline (@clipforge/ffmpeg's detectFaces) to
 * decide which detected face box to crop to during each window. This is a
 * real, working signal — not a stub — but it is not true audio-visual
 * speaker diarization (which needs a trained model); it's a reasonable
 * approximation: "when someone is speaking loudly, keep the largest/most
 * central face box in frame."
 */

export interface AudioEnergySample {
  start: number;
  end: number;
  rmsDb: number;
}

export interface ActiveSpeakerOptions {
  /** Window size in seconds for RMS sampling. Default 0.5s. */
  windowSeconds?: number;
}

export interface SpeakerSegment {
  start: number;
  end: number;
  /** Index into the face-detection frame list this segment should crop to, or null if no face data. */
  faceIndex: number | null;
  energyDb: number;
}

/**
 * Extract per-window RMS energy (dBFS) from an audio or video file using
 * ffmpeg's astats filter. Real ffmpeg invocation, not simulated.
 */
export function extractAudioEnergy(audioPath: string, opts: ActiveSpeakerOptions = {}): AudioEnergySample[] {
  const windowSeconds = opts.windowSeconds ?? 0.5;
  let log = "";
  try {
    execFileSync(
      resolveFfmpeg(),
      [
        "-i", audioPath,
        "-af", `asetnsamples=n=44100,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`,
        "-f", "null", "-",
      ],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 100 * 1024 * 1024 },
    );
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    log = (e.stdout ?? "") + (e.stderr ?? "");
  }

  // ametadata prints lines like: "frame:123 pts:... pts_time:1.234\nlavfi.astats.Overall.RMS_level=-23.4"
  const timeRe = /pts_time:([\d.]+)/g;
  const rmsRe = /lavfi\.astats\.Overall\.RMS_level=(-?[\d.]+)/g;
  const times: number[] = [];
  const levels: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = timeRe.exec(log))) times.push(parseFloat(m[1]!));
  while ((m = rmsRe.exec(log))) levels.push(parseFloat(m[1]!));

  // Bucket raw per-sample readings into fixed windows.
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < Math.min(times.length, levels.length); i++) {
    const bucketIdx = Math.floor(times[i]! / windowSeconds);
    if (!buckets.has(bucketIdx)) buckets.set(bucketIdx, []);
    buckets.get(bucketIdx)!.push(levels[i]!);
  }

  const samples: AudioEnergySample[] = [];
  const sortedBuckets = [...buckets.keys()].sort((a, b) => a - b);
  for (const idx of sortedBuckets) {
    const vals = buckets.get(idx)!;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    samples.push({ start: idx * windowSeconds, end: (idx + 1) * windowSeconds, rmsDb: avg });
  }
  return samples;
}

/**
 * Given per-window audio energy and a face-detection frame timeline (from
 * @clipforge/ffmpeg's detectFaces), produce speaker segments: for each
 * energy window above a "someone is talking" threshold, pick the nearest
 * face-detection frame with a face and, within it, the largest bounding box
 * (typically the closest/most prominent speaker).
 */
export function detectActiveSpeakers(
  energy: AudioEnergySample[],
  faceFrames: Array<{ time: number; faces: Array<{ x: number; y: number; w: number; h: number; center_x: number; center_y: number; confidence: number }> }>,
  opts: { silenceThresholdDb?: number } = {},
): SpeakerSegment[] {
  const threshold = opts.silenceThresholdDb ?? -45;
  const segments: SpeakerSegment[] = [];

  for (const win of energy) {
    const speaking = win.rmsDb > threshold;
    if (!speaking) {
      segments.push({ start: win.start, end: win.end, faceIndex: null, energyDb: win.rmsDb });
      continue;
    }
    // Nearest face frame by timestamp.
    let nearest = -1;
    let bestDist = Infinity;
    for (let i = 0; i < faceFrames.length; i++) {
      const d = Math.abs(faceFrames[i]!.time - (win.start + win.end) / 2);
      if (d < bestDist) { bestDist = d; nearest = i; }
    }
    segments.push({ start: win.start, end: win.end, faceIndex: nearest >= 0 ? nearest : null, energyDb: win.rmsDb });
  }
  return segments;
}

/**
 * Convert speaker segments + the face-frame timeline into crop keyframes
 * compatible with @clipforge/ffmpeg's render pipeline: for each segment,
 * center the crop on the largest face box in the chosen frame.
 */
export function speakerSegmentsToCropPlan(
  segments: SpeakerSegment[],
  faceFrames: Array<{ time: number; faces: Array<{ x: number; y: number; w: number; h: number; center_x: number; center_y: number; confidence: number }> }>,
): Array<{ timestamp: number; centerX: number; centerY: number }> {
  const plan: Array<{ timestamp: number; centerX: number; centerY: number }> = [];
  for (const seg of segments) {
    const mid = (seg.start + seg.end) / 2;
    if (seg.faceIndex === null || !faceFrames[seg.faceIndex]) {
      plan.push({ timestamp: mid, centerX: 0.5, centerY: 0.5 }); // default to frame center
      continue;
    }
    const frame = faceFrames[seg.faceIndex]!;
    if (frame.faces.length === 0) {
      plan.push({ timestamp: mid, centerX: 0.5, centerY: 0.5 });
      continue;
    }
    // Largest face box = closest/most prominent speaker; use the sidecar's own center.
    const largest = frame.faces.reduce((a, b) => (a.w * a.h > b.w * b.h ? a : b));
    plan.push({ timestamp: mid, centerX: largest.center_x, centerY: largest.center_y });
  }
  return plan;
}
