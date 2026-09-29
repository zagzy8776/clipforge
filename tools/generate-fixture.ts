/**
 * Generate a synthetic test video for development/testing.
 * Creates a 60-second test pattern video with tone audio.
 *
 * Usage: pnpm generate:fixture
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolveFfmpeg } from "@clipforge/ffmpeg";

const OUTPUT_DIR = join(process.cwd(), "input");
const OUTPUT_FILE = join(OUTPUT_DIR, "test-fixture.mp4");

async function main(): Promise<void> {
  console.log("🎬 Generating test fixture video...\n");

  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (existsSync(OUTPUT_FILE)) {
    console.log(`  ✓ ${OUTPUT_FILE} already exists. Remove it to regenerate.`);
    return;
  }

  const ffmpeg = resolveFfmpeg();

  // Create a 120-second test video with:
  // - Plain color-bars pattern (no drawtext — this ffmpeg build's filtergraph
  //   parser chokes on the %{pts:hms} expansion syntax regardless of escaping)
  // - A tone silenced at a few well-spaced windows, so silence-based
  //   heuristic segmentation (the zero-dependency transcription fallback)
  //   gets segments that actually fall within the engine's default
  //   minClipDuration/maxClipDuration bounds (20s-90s) — packing silence
  //   gaps too close together produces only short segments that never
  //   qualify as a candidate moment at all.
  const silenceWindows = "between(t,28,30)+between(t,60,62)+between(t,92,94)";
  const args = [
    "-y",
    "-f", "lavfi",
    "-i", "testsrc2=duration=120:size=1920x1080:rate=30",
    "-f", "lavfi",
    "-i", "sine=frequency=440:duration=120",
    "-af", `volume=enable='${silenceWindows}':volume=0`,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "128k",
    "-shortest",
    OUTPUT_FILE,
  ];

  console.log(`  Running ffmpeg...`);
  execFileSync(ffmpeg, args, { stdio: "pipe" });

  console.log(`  ✓ Generated: ${OUTPUT_FILE}`);
  console.log(`    Duration: 120s | Resolution: 1920x1080 | Codec: h264/aac`);
  console.log(`\n  You can now run: pnpm clipforge input/test-fixture.mp4`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
