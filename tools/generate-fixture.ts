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

  // Create a 60-second test video with:
  // - Color bars + timer overlay
  // - Sine wave tone with speech-like modulation
  const args = [
    "-y",
    "-f", "lavfi",
    "-i", "testsrc2=duration=60:size=1920x1080:rate=30",
    "-f", "lavfi",
    "-i", "sine=frequency=440:duration=60",
    "-vf",
    "drawtext=text='%{pts\:hms}':x=10:y=10:fontsize=48:fontcolor=white:borderw=2:bordercolor=black",
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
  console.log(`    Duration: 60s | Resolution: 1920x1080 | Codec: h264/aac`);
  console.log(`\n  You can now run: pnpm clipforge input/test-fixture.mp4`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
