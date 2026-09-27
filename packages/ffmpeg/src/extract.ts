import { execFfmpeg } from "./exec.js";

/**
 * Extract a mono/stereo WAV audio track from a video file,
 * normalized to 16 kHz mono for optimal transcription.
 *
 * @param inputPath  Path to the source video.
 * @param outputPath Where to write the WAV file.
 * @param sampleRate Defaults to 16000 (16 kHz) for speech models.
 */
export function extractAudio(
  inputPath: string,
  outputPath: string,
  sampleRate = 16_000,
): string {
  execFfmpeg([
    "-y",
    "-i", inputPath,
    "-vn",
    "-acodec", "pcm_s16le",
    "-ar", String(sampleRate),
    "-ac", "1",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,highpass=f=80,afftdn=nf=-25",
    outputPath,
  ]);
  return outputPath;
}
