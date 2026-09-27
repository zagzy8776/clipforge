import { execFfmpeg } from "./exec.js";

/**
 * Extract a thumbnail frame from a video at a given timestamp.
 */
export function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timeSeconds: number,
  width = 1080,
  height = 1920,
): string {
  execFfmpeg([
    "-y",
    "-ss", String(timeSeconds),
    "-i", videoPath,
    "-vframes", "1",
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    "-q:v", "2",
    outputPath,
  ]);
  return outputPath;
}
