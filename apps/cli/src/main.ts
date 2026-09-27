#!/usr/bin/env node
import { runEngine, type EngineInput } from "@clipforge/core";
import type { EngineConfig } from "@clipforge/types";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const command = args[0] ?? "run";
const videoArg = args[1];
const outputArg = args[2] ?? "./output";

function printUsage(): void {
  console.log(`
  ClipForge — AI Short-Form Video Intelligence Engine

  Usage:
    clipforge <video-path> [output-dir]     Analyze & render clips
    clipforge probe <video-path>            Probe video metadata

  Options:
    --clips <n>         Number of clips (default: 10)
    --aspect <ratio>    9:16 | 1:1 | 4:5 (default: 9:16)
    --style <name>      modern | bold | dynamic | minimal | karaoke
    --mode <name>       podcast | educational | hype
    --provider <name>   heuristic | openai | hybrid (default: heuristic)
    --min-duration <s>  Min clip duration (default: 20)
    --max-duration <s>  Max clip duration (default: 90)
  `);
}

function parseFlags(raw: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 2; i < raw.length; i++) {
    if (raw[i]!.startsWith("--")) {
      const key = raw[i]!.slice(2);
      const val = raw[i + 1] && !raw[i + 1]!.startsWith("--") ? raw[++i]! : "true";
      flags[key] = val;
    }
  }
  return flags;
}

async function main(): Promise<void> {
  if (command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "probe" && videoArg) {
    const { probe } = await import("@clipforge/ffmpeg");
    const info = probe(resolve(videoArg));
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  // Default: run the full engine
  const videoPath = resolve(command === "run" ? (videoArg ?? "") : command);
  const outputDir = resolve(outputArg);
  const flags = parseFlags(process.argv);

  const config: EngineConfig = {
    projectId: `proj-${Date.now()}`,
    outputDir,
    targetClips: parseInt(flags["clips"] ?? "10", 10),
    minClipDuration: parseInt(flags["min-duration"] ?? "20", 10),
    maxClipDuration: parseInt(flags["max-duration"] ?? "90", 10),
    preferredClipDuration: 45,
    candidateStride: 5,
    aspectRatio: (flags["aspect"] as EngineConfig["aspectRatio"]) ?? "9:16",
    mode: (flags["mode"] as EngineConfig["mode"]) ?? "podcast",
    captionStyle: (flags["style"] as EngineConfig["captionStyle"]) ?? "modern",
    reframe: "center-crop",
    pausePolicy: { cutPausesLongerThan: 0.45, keepPause: 0.18, minimumCut: 0.12 },
    weights: { hook: 0.20, emotion: 0.15, novelty: 0.15, information: 0.15, curiosity: 0.10, payoff: 0.15, coherence: 0.10 },
    transcription: {
      provider: "silence-based-fallback",
      model: "heuristic",
      language: null,
      minimumScore: 20,
      duplicateThreshold: 0.55,
      analysisModel: "heuristic-local",
    },
    render: {
      path: "ffmpeg", width: 1080, height: 1920, fps: 30,
      videoBitrate: "0", audioBitrate: "192k",
      preset: "veryfast", crf: 23, pixelFormat: "yuv420p",
      fastStart: true, audioSampleRate: 48000,
      colorRange: "limited", background: "#000000", videoCodec: "libx264",
    },
    thumbnail: { at: 0.5, width: 1080, height: 1920, format: "jpg", quality: 3 },
    preview: { enabled: false, maxSeconds: 30, scale: 0.5 },
    keepIntermediate: true,
    captionsEnabled: true,
    concurrency: 1,
    seed: 42,
  };

  const provider = (flags["provider"] as "heuristic" | "openai" | "hybrid") ?? "heuristic";

  console.log(`\n🎬 ClipForge v0.1.0`);
  console.log(`   Input: ${videoPath}`);
  console.log(`   Output: ${outputDir}`);
  console.log(`   Provider: ${provider}\n`);

  const result = await runEngine({
    videoPath,
    config,
    provider,
    progress: (evt) => {
      const pct = `${Math.round(evt.progress * 100)}%`.padStart(4);
      console.log(`  [${pct}] ${evt.message}`);
    },
  });

  console.log(`\n${"─".repeat(50)}`);
  if (result.status === "completed") {
    console.log(`✅ Complete! ${result.clips.length} clips rendered in ${Math.round(result.totalRenderMs / 1000)}s`);
    for (const clip of result.clips) {
      console.log(`  #${clip.index + 1}  ${clip.score}/100  ${clip.title}`);
      console.log(`       ${clip.videoPath}`);
    }
  } else {
    console.error(`❌ Failed: ${result.error}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
