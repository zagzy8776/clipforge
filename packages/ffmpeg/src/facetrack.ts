import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface FaceFrame {
  time: number;
  faces: Array<{ x: number; y: number; w: number; h: number; center_x: number; center_y: number; confidence: number }>;
}

export interface FaceTrackResult {
  frames: FaceFrame[];
  primarySpeaker: { x: number; y: number; w: number; h: number } | null;
  totalFrames: number;
  framesWithFaces: number;
  video_width: number;
  video_height: number;
}

export interface CropKeyframe {
  t: number;
  cx: number;
  cy: number;
}

const __dir = dirname(fileURLToPath(import.meta.url));
const SIDECAR = join(__dir, "..", "..", "..", "..", "tools", "face_detect.py");

/**
 * Detect faces in video frames using OpenCV via Python sidecar.
 * Returns per-frame face positions for speaker-aware reframing.
 */
export function detectFaces(videoPath: string, sampleRate = 1.0): FaceTrackResult {
  try {
    const result = execFileSync("python", [
      SIDECAR, videoPath,
      "--sample-rate", String(sampleRate),
      "--output", "json",
    ], {
      stdio: "pipe",
      timeout: 10 * 60_000,
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(result.toString("utf-8"));
  } catch {
    return { frames: [], primarySpeaker: null, totalFrames: 0, framesWithFaces: 0, video_width: 0, video_height: 0 };
  }
}

/**
 * Get crop timeline for ffmpeg — piecewise-linear keyframes.
 */
export function getCropTimeline(videoPath: string, sampleRate = 2.0): CropKeyframe[] {
  try {
    const result = execFileSync("python", [
      SIDECAR, videoPath,
      "--sample-rate", String(sampleRate),
      "--output", "crop-json",
    ], {
      stdio: "pipe",
      timeout: 10 * 60_000,
      maxBuffer: 50 * 1024 * 1024,
    });
    const data = JSON.parse(result.toString("utf-8"));
    return data.crop_timeline ?? [];
  } catch {
    return [];
  }
}
