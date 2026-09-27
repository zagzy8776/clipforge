import { existsSync, statSync } from "node:fs";
import { execFfprobe } from "./exec.js";
import type { MediaProbe } from "@clipforge/types";

/**
 * Probe a video file and return structured metadata.
 * Uses ffprobe JSON output for reliable parsing.
 */
export function probe(filePath: string): MediaProbe {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const { stdout } = execFfprobe([
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  const data = JSON.parse(stdout) as {
    format: {
      duration?: string;
      size?: string;
      bit_rate?: string;
      format_name?: string;
    };
    streams: Array<{
      codec_type: string;
      codec_name?: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
      sample_rate?: string;
      channels?: number;
    }>;
  };

  const videoStream = data.streams.find((s) => s.codec_type === "video") ?? null;
  const audioStream = data.streams.find((s) => s.codec_type === "audio");

  const duration = parseFloat(data.format.duration ?? "0");
  const fps = videoStream ? parseFps(videoStream.r_frame_rate ?? "0/1") : 0;
  const sizeBytes = statSync(filePath).size;

  return {
    path: filePath,
    duration,
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    fps,
    videoCodec: videoStream?.codec_name ?? "none",
    audioCodec: audioStream?.codec_name ?? null,
    hasAudio: !!audioStream,
    audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate, 10) : null,
    audioChannels: audioStream?.channels ?? null,
    bitrate: data.format.bit_rate ? parseInt(data.format.bit_rate, 10) : null,
    sizeBytes,
    formatName: data.format.format_name ?? "unknown",
  };
}

/** Safe version that returns null instead of throwing. */
export function probeSafe(filePath: string): MediaProbe | null {
  try {
    return probe(filePath);
  } catch {
    return null;
  }
}

/** Parse "30000/1001" or "30" style FPS strings. */
function parseFps(rate: string): number {
  const parts = rate.split("/");
  if (parts.length === 2) {
    const num = parseInt(parts[0]!, 10);
    const den = parseInt(parts[1]!, 10);
    return den > 0 ? num / den : 0;
  }
  return parseFloat(rate) || 0;
}
